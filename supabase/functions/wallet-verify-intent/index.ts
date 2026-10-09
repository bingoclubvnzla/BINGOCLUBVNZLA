import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * BINGO CLUB VNZLA - WALLET TRANSACTION GUARD
 * En FASE 1: Las operaciones financieras reales están DESACTIVADAS por directriz de arquitectura.
 * Esta función valida llaves de idempotencia y rechaza intentos de dinero real en fase de pruebas.
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

  return new Response(
    JSON.stringify({
      error: "FINANCIAL_OPERATIONS_DISABLED_IN_PHASE_1",
      phase: 1,
      mode: "TEST_MODE",
      message: "Operaciones con dinero real deshabilitadas en Fase 1. Estructura arquitectónica preparada para Fase 2.",
    }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }
  );
});
