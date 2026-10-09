// =====================================================================
// BINGO CLUB VNZLA ONLINE - SERVER-AUTHORITATIVE EDGE FUNCTION
// Función: process-draw-tick
// Responsabilidad: Generación server-side de números sorteados.
// El navegador NUNCA decide los números sorteados.
// =====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DrawTickPayload {
  drawId: string;
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
        JSON.stringify({ error: "Configuración de entorno del servidor incompleta." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validar autorización del operador que solicita el tick
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autorización requerida." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Sesión inválida o expirada." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar rol del actor en base de datos
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || !["OPERATOR", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: "Permiso denegado. Se requiere rol de Operador o superior." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { drawId }: DrawTickPayload = await req.json();

    // Obtener estado actual del sorteo
    const { data: draw, error: drawError } = await supabase
      .from("draws")
      .select("id, status, modality_code, drawn_numbers, total_balls_called")
      .eq("id", drawId)
      .single();

    if (drawError || !draw) {
      return new Response(
        JSON.stringify({ error: "Sorteo no encontrado." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Comprobar estado del sorteo (Máquina de estados estricta)
    if (draw.status !== "ACTIVE") {
      return new Response(
        JSON.stringify({ error: `El sorteo no está activo. Estado actual: ${draw.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Obtener configuración de modalidad
    const { data: modality } = await supabase
      .from("game_modalities")
      .select("total_elements")
      .eq("code", draw.modality_code)
      .single();

    const maxElements = modality?.total_elements || 75;
    const existingDrawn = new Set<number>(draw.drawn_numbers || []);

    if (existingDrawn.size >= maxElements) {
      // Marcar sorteo como FINISHED
      await supabase
        .from("draws")
        .update({ status: "FINISHED", finished_at: new Date().toISOString() })
        .eq("id", drawId);

      return new Response(
        JSON.stringify({ message: "Todas las balotas han sido extraídas. Sorteo finalizado.", finished: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extraer balota mediante CSPRNG (Server Authoritative)
    const availableBalls: number[] = [];
    for (let i = 1; i <= maxElements; i++) {
      if (!existingDrawn.has(i)) {
        availableBalls.push(i);
      }
    }

    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const chosenIndex = randomBuffer[0] % availableBalls.length;
    const nextBall = availableBalls[chosenIndex];

    const updatedNumbers = [...(draw.drawn_numbers || []), nextBall];
    const sequenceNumber = (draw.total_balls_called || 0) + 1;

    // Registrar evento de balota en draw_events (Event Sourcing)
    await supabase.from("draw_events").insert({
      draw_id: drawId,
      sequence_number: sequenceNumber,
      event_type: "BALL_DRAWN",
      ball_value: nextBall,
      payload: { ball: nextBall, sequence: sequenceNumber, remaining: availableBalls.length - 1 }
    });

    // Actualizar registro del sorteo
    await supabase
      .from("draws")
      .update({
        drawn_numbers: updatedNumbers,
        current_ball: nextBall,
        total_balls_called: sequenceNumber,
      })
      .eq("id", drawId);

    return new Response(
      JSON.stringify({
        success: true,
        ball: nextBall,
        sequence: sequenceNumber,
        totalDrawn: updatedNumbers.length
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const error = err as Error;
    return new Response(
      JSON.stringify({ error: error.message || "Error interno del servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
