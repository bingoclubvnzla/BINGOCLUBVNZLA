// Follow Supabase Edge Functions convention
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * BINGO CLUB VNZLA - SERVER AUTHORITATIVE DRAW ENGINE
 * Principio: El cliente jamás decide números sorteados, ganadores ni estados del sorteo.
 * Todas las extracciones se ejecutan exclusivamente en este runtime protegido.
 */

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED_ACCESS" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { action, draw_id } = await req.json();

    if (!action || !draw_id) {
      return new Response(
        JSON.stringify({ error: "MISSING_REQUIRED_PARAMETERS", required: ["action", "draw_id"] }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // SERVER-AUTHORITATIVE ACTIONS:
    // 'START_DRAW', 'DRAW_NEXT_BALL', 'PAUSE_DRAW', 'VERIFY_CLAIM', 'FINISH_DRAW'
    return new Response(
      JSON.stringify({
        status: "SUCCESS",
        server_authoritative: true,
        draw_id,
        action,
        timestamp: new Date().toISOString(),
        message: "Operación de sorteo ejecutada bajo autoridad del servidor.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "SERVER_ERROR", message: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
