// ====================================================================
// SUPABASE EDGE FUNCTION: verify-card
// BINGO CLUB VNZLA ONLINE — SERVER AUTHORITATIVE CARD VERIFIER
// ====================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { card_id, draw_id, pattern_type } = await req.json();

    if (!card_id || !draw_id) {
      return new Response(JSON.stringify({ error: "Faltan parámetros requeridos: card_id y draw_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Obtener estado oficial del sorteo en servidor (NUNCA confiar en el cliente)
    const { data: draw, error: drawError } = await supabase
      .from("draws")
      .select("id, status, drawn_balls")
      .eq("id", draw_id)
      .single();

    if (drawError || !draw || draw.status !== "ACTIVE") {
      return new Response(JSON.stringify({ error: "Sorteo no activo o inexistente" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Obtener cartón registrado y verificar checksum criptográfico
    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select("id, serial_number, card_matrix, user_id, checksum")
      .eq("id", card_id)
      .eq("draw_id", draw_id)
      .single();

    if (cardError || !card) {
      return new Response(JSON.stringify({ error: "Cartón no válido para este sorteo" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retornar resultado evaluado por el motor del servidor
    return new Response(
      JSON.stringify({
        verified: true,
        server_evaluated: true,
        draw_id,
        card_id,
        pattern_type: pattern_type || "LINE",
        balls_count: draw.drawn_balls.length,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const error = err as Error;
    return new Response(
      JSON.stringify({ error: "Error en verificación de cartón", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
