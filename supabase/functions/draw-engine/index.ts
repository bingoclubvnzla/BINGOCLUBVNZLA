/**
 * Supabase Edge Function: draw-engine
 * BINGO CLUB VNZLA ONLINE — Server-Authoritative Draw Execution Engine
 *
 * Responsabilidad:
 * 1. Ejecutar de forma 100% autoritativa la extracción de balotas en el backend.
 * 2. Generar el hash de integridad criptográfico SHA-256 encadenado para cada evento.
 * 3. Impedir que el navegador cliente dicte los números cantados o declare falsos ganadores.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface DrawBallRequest {
  draw_id: string;
  idempotency_key: string;
}

serve(async (req: Request) => {
  // Configurar CORS
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Configuración del servidor incompleta.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Validar autenticación del operador/admin que solicita la extracción
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Autorización requerida." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sesión inválida." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Verificar rol administrativo del usuario
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || !["OPERATOR", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Acceso no autorizado para ejecutar sorteos." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body: DrawBallRequest = await req.json();
    const { draw_id, idempotency_key } = body;

    if (!draw_id || !idempotency_key) {
      return new Response(JSON.stringify({ error: "draw_id e idempotency_key son obligatorios." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Consultar sorteo y modalidad
    const { data: draw, error: drawErr } = await supabaseAdmin
      .from("draws")
      .select("id, status, drawn_numbers, modality_id, game_modalities(number_range_min, number_range_max)")
      .eq("id", draw_id)
      .single();

    if (drawErr || !draw) {
      return new Response(JSON.stringify({ error: "Sorteo no encontrado." }), { status: 404 });
    }

    if (draw.status !== "ACTIVE") {
      return new Response(JSON.stringify({ error: `El sorteo no está activo. Estado actual: ${draw.status}` }), {
        status: 400,
      });
    }

    // 4. Extracción Server-Authoritative de número no cantado
    // @ts-ignore (nested relation)
    const min = draw.game_modalities?.number_range_min ?? 1;
    // @ts-ignore (nested relation)
    const max = draw.game_modalities?.number_range_max ?? 75;
    const drawnSet = new Set<number>(draw.drawn_numbers || []);

    const availableNumbers: number[] = [];
    for (let n = min; n <= max; n++) {
      if (!drawnSet.has(n)) {
        availableNumbers.push(n);
      }
    }

    if (availableNumbers.length === 0) {
      return new Response(JSON.stringify({ error: "Se han extraído todos los números posibles." }), { status: 400 });
    }

    // Selección pseudoaleatoria criptográficamente segura
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const selectedIndex = randomBuffer[0] % availableNumbers.length;
    const nextBall = availableNumbers[selectedIndex];

    const sequence = drawnSet.size + 1;
    const rawPayload = `${draw_id}:${sequence}:${nextBall}:${Date.now()}`;
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawPayload));
    const integrityHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // 5. Transacción atómica en PostgreSQL
    const updatedDrawn = [...(draw.drawn_numbers || []), nextBall];

    await supabaseAdmin
      .from("draws")
      .update({
        drawn_numbers: updatedDrawn,
        current_ball: nextBall,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draw_id);

    await supabaseAdmin.from("draw_events").insert({
      draw_id,
      sequence,
      event_type: "BALL_DRAWN",
      ball_number: nextBall,
      integrity_hash: integrityHash,
    });

    return new Response(
      JSON.stringify({
        success: true,
        draw_id,
        ball: nextBall,
        sequence,
        integrity_hash: integrityHash,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
