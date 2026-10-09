// =====================================================================
// BINGO CLUB VNZLA ONLINE - SERVER-AUTHORITATIVE EDGE FUNCTION
// Función: validate-transaction
// Responsabilidad: Validación de idempotencia y prevención de transacciones duplicadas.
// =====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { idempotencyKey } = await req.json();

    if (!idempotencyKey || typeof idempotencyKey !== "string") {
      return new Response(
        JSON.stringify({ error: "Clave de idempotencia requerida." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar si la clave de idempotencia ya fue procesada
    const { data: existingTx } = await supabase
      .from("wallet_transactions")
      .select("id, status, created_at")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingTx) {
      return new Response(
        JSON.stringify({
          duplicate: true,
          message: "Operación previamente procesada (protección contra replay/duplicados).",
          transactionId: existingTx.id,
          status: existingTx.status
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ duplicate: false, message: "Clave de idempotencia válida para procesamiento." }),
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
