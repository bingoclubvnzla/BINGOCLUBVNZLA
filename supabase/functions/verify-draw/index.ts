// ============================================================================
// BINGO CLUB VNZLA ONLINE — EDGE FUNCTION: VERIFICACIÓN SERVER-AUTHORITATIVE
// Principio: El cliente nunca declara ganadores ni calcula balotas premiadas.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyDrawRequest {
  drawId: string;
  cardId: string;
  claimedPattern: "LINEA" | "ESQUINAS" | "CARTON_LLENO" | "DIAGONAL";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Configuración del servidor incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cliente seguro con privilegios de verificación server-side
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Validar autenticación del usuario desde el JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token de autenticación requerido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Sesión inválida o expirada" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { drawId, cardId, claimedPattern }: VerifyDrawRequest = await req.json();

    if (!drawId || !cardId || !claimedPattern) {
      return new Response(
        JSON.stringify({ error: "Parámetros de verificación incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Obtener el sorteo y su secuencia autoritativa de balotas
    const { data: draw, error: drawError } = await supabase
      .from("draws")
      .select("id, status, ball_sequence, modality_id")
      .eq("id", drawId)
      .single();

    if (drawError || !draw) {
      return new Response(
        JSON.stringify({ error: "Sorteo no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (draw.status !== "ACTIVE" && draw.status !== "FINISHED") {
      return new Response(
        JSON.stringify({ error: "El sorteo no se encuentra en estado de verificación" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Validar pertenencia del cartón al usuario autenticado
    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select("id, user_id, matrix, status")
      .eq("id", cardId)
      .eq("draw_id", drawId)
      .single();

    if (cardError || !card || card.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Cartón no válido o no pertenece al usuario autenticado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Auditoría de la solicitud
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      actor_role: "PLAYER",
      action: "CLAIM_DRAW_VERIFICATION",
      entity_type: "cards",
      entity_id: cardId,
      metadata: { drawId, claimedPattern, totalDrawn: draw.ball_sequence.length }
    });

    return new Response(
      JSON.stringify({
        success: true,
        verified: false,
        message: "En Fase 1, la resolución de premios opera en modo de validación arquitectónica.",
        serverDrawnCount: draw.ball_sequence.length
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
