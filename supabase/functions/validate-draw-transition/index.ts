// supabase/functions/validate-draw-transition/index.ts
// Edge Function: Validación de transición de máquina de estados de sorteos

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEGAL_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["READY", "PAUSED", "CANCELLED"],
  READY: ["ACTIVE", "PAUSED", "CANCELLED"],
  ACTIVE: ["PAUSED", "FINISHED"],
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sesión inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar que el usuario tenga rol de operador o admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const allowedRoles = ["OPERATOR", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"];
    if (!profile || !allowedRoles.includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Permiso denegado: Se requiere rol de Operador o Administrador" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { draw_id, target_status, reason } = await req.json();
    if (!draw_id || !target_status) {
      return new Response(JSON.stringify({ error: "draw_id y target_status son obligatorios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Consultar estado actual
    const { data: currentDraw, error: drawFetchErr } = await supabase
      .from("draws")
      .select("id, status, title")
      .eq("id", draw_id)
      .single();

    if (drawFetchErr || !currentDraw) {
      return new Response(JSON.stringify({ error: "Sorteo no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedTargets = LEGAL_TRANSITIONS[currentDraw.status] || [];
    if (!allowedTargets.includes(target_status)) {
      return new Response(
        JSON.stringify({
          error: `Transición ilícita: No se puede cambiar de ${currentDraw.status} a ${target_status}. Transiciones válidas: [${allowedTargets.join(", ")}]`,
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Ejecutar actualización
    const updates: Record<string, unknown> = {
      status: target_status,
      updated_at: new Date().toISOString(),
    };

    if (target_status === "ACTIVE" && !currentDraw.started_at) {
      updates.started_at = new Date().toISOString();
    }
    if (target_status === "FINISHED") {
      updates.finished_at = new Date().toISOString();
    }

    const { error: updateErr } = await supabase
      .from("draws")
      .update(updates)
      .eq("id", draw_id);

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Registrar en operator_actions
    await supabase.from("operator_actions").insert({
      operator_id: user.id,
      action_type: `DRAW_TRANSITION_${currentDraw.status}_TO_${target_status}`,
      target_draw_id: draw_id,
      notes: reason || `Transición autoritativa por operador ${profile.role}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        previous_status: currentDraw.status,
        new_status: target_status,
        draw_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Fallo interno al evaluar transición" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
