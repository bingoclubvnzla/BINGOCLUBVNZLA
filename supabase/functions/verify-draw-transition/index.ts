// Supabase Edge Function: verify-draw-transition
// Servidor Autoritativo: Valida y ejecuta transiciones de estado de sorteos
// DRAFT -> SCHEDULED -> READY -> ACTIVE -> PAUSED -> FINISHED -> ARCHIVED / CANCELLED

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["READY", "CANCELLED", "DRAFT"],
  READY: ["ACTIVE", "PAUSED", "CANCELLED"],
  ACTIVE: ["PAUSED", "FINISHED", "CANCELLED"],
  PAUSED: ["ACTIVE", "CANCELLED"],
  FINISHED: ["ARCHIVED"],
  CANCELLED: ["ARCHIVED"],
  ARCHIVED: [],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Verificar identidad del operador
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido o expirado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar rol del actor en base de datos
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || !["OPERATOR", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: "Permiso denegado: Se requiere rol de OPERADOR o superior" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { draw_id, target_status, reason } = await req.json();

    if (!draw_id || !target_status) {
      return new Response(
        JSON.stringify({ error: "draw_id y target_status son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Consultar estado actual
    const { data: currentDraw, error: drawErr } = await supabaseClient
      .from("draws")
      .select("id, status")
      .eq("id", draw_id)
      .single();

    if (drawErr || !currentDraw) {
      return new Response(JSON.stringify({ error: "Sorteo no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedNext = VALID_TRANSITIONS[currentDraw.status] || [];
    if (!allowedNext.includes(target_status)) {
      return new Response(
        JSON.stringify({
          error: `Transición inválida de ${currentDraw.status} a ${target_status}. Transiciones permitidas: [${allowedNext.join(", ")}]`,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aplicar cambio de estado en el servidor
    const updatePayload: Record<string, unknown> = {
      status: target_status,
      updated_at: new Date().toISOString(),
    };

    if (target_status === "ACTIVE") updatePayload.started_at = new Date().toISOString();
    if (target_status === "FINISHED") updatePayload.finished_at = new Date().toISOString();

    const { data: updatedDraw, error: updateErr } = await supabaseClient
      .from("draws")
      .update(updatePayload)
      .eq("id", draw_id)
      .select()
      .single();

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Registrar en audit_logs de forma inmutable
    await supabaseClient.from("audit_logs").insert({
      user_id: user.id,
      actor_role: profile.role,
      action: "DRAW_STATE_TRANSITION",
      entity_type: "DRAW",
      entity_id: draw_id,
      metadata: {
        from: currentDraw.status,
        to: target_status,
        reason: reason || "Operación regular",
      },
    });

    return new Response(JSON.stringify({ success: true, draw: updatedDraw }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error interno de servidor";
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
