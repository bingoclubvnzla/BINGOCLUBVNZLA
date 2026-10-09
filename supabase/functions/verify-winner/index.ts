// =====================================================================
// BINGO CLUB VNZLA ONLINE - SERVER-AUTHORITATIVE EDGE FUNCTION
// Función: verify-winner
// Responsabilidad: Validación server-authoritative de cartones ganadores.
// El navegador NUNCA decide los ganadores ni los premios.
// =====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyWinnerPayload {
  drawId: string;
  cardId: string;
  patternType: "LINEA" | "CUATRO_ESQUINAS" | "CARTON_LLENO";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autorización requerida." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Sesión no válida." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { drawId, cardId, patternType }: VerifyWinnerPayload = await req.json();

    // 1. Obtener información del sorteo
    const { data: draw, error: drawErr } = await supabase
      .from("draws")
      .select("id, status, drawn_numbers, current_ball")
      .eq("id", drawId)
      .single();

    if (drawErr || !draw || draw.status !== "ACTIVE") {
      return new Response(
        JSON.stringify({ error: "El sorteo no está activo." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Obtener cartón y verificar propiedad
    const { data: card, error: cardErr } = await supabase
      .from("cards")
      .select("id, draw_id, user_id, matrix_data, is_active")
      .eq("id", cardId)
      .eq("draw_id", drawId)
      .single();

    if (cardErr || !card || !card.is_active) {
      return new Response(
        JSON.stringify({ error: "Cartón no válido o inactivo." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (card.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "No es propietario de este cartón." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Evaluar matemáticamente el patrón solicitado contra los números sorteados
    const drawnSet = new Set<number>(draw.drawn_numbers || []);
    const matrix: (number | string)[][] = card.matrix_data;
    const rows = matrix.length;
    const cols = matrix[0].length;

    const isCellMarked = (val: number | string): boolean => {
      if (val === "FREE" || val === 0) return true; // Centro libre
      return typeof val === "number" && drawnSet.has(val);
    };

    let isWinning = false;

    if (patternType === "LINEA") {
      // Verificar si alguna fila horizontal está completamente cantada
      for (let r = 0; r < rows; r++) {
        const rowFilled = matrix[r].every(cell => isCellMarked(cell));
        if (rowFilled) {
          isWinning = true;
          break;
        }
      }
    } else if (patternType === "CUATRO_ESQUINAS") {
      const c1 = isCellMarked(matrix[0][0]);
      const c2 = isCellMarked(matrix[0][cols - 1]);
      const c3 = isCellMarked(matrix[rows - 1][0]);
      const c4 = isCellMarked(matrix[rows - 1][cols - 1]);
      isWinning = c1 && c2 && c3 && c4;
    } else if (patternType === "CARTON_LLENO") {
      isWinning = matrix.every(row => row.every(cell => isCellMarked(cell)));
    }

    if (!isWinning) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: "El cartón no cumple con el patrón ganador con las balotas cantadas hasta el momento."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Si es ganador válido, registrar en la tabla winners de forma server-authoritative
    const { data: prize } = await supabase
      .from("prizes")
      .select("id, amount")
      .eq("draw_id", drawId)
      .eq("prize_pattern", patternType)
      .single();

    if (prize) {
      await supabase.from("winners").insert({
        draw_id: drawId,
        prize_id: prize.id,
        card_id: cardId,
        user_id: user.id,
        validation_status: "VALIDATED",
        winning_ball: draw.current_ball || 0,
        balls_count: draw.drawn_numbers.length,
        verified_at: new Date().toISOString()
      });
    }

    return new Response(
      JSON.stringify({
        valid: true,
        pattern: patternType,
        winningBall: draw.current_ball,
        ballsCount: draw.drawn_numbers.length
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const error = err as Error;
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
