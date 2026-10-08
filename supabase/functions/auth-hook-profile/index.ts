// Supabase Edge Function: auth-hook-profile
// Trigger de webhook para inicialización de perfil con ID público BCV-XXXXXX

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateBcvId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "BCV-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const payload = await req.json();
    const user = payload.record;

    if (!user || !user.id) {
      return new Response(JSON.stringify({ error: "No user record found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const publicId = generateBcvId();
    const displayName = user.user_metadata?.display_name || `Jugador_${publicId.substring(4)}`;
    const fullName = user.user_metadata?.full_name || "Jugador Bingo Club";
    const phone = user.user_metadata?.phone || "+584120000000";

    const { error: profileError } = await supabaseClient.from("profiles").insert({
      user_id: user.id,
      public_id: publicId,
      display_name: displayName,
      full_name: fullName,
      phone: phone,
      role: "PLAYER",
      status: "ACTIVE",
      security_level: 1,
    });

    if (profileError) {
      console.error("Error creating profile:", profileError);
    }

    // Inicializar billetera (Fase 1: saldo 0.00 inactivo)
    await supabaseClient.from("wallets").insert({
      user_id: user.id,
      balance: 0.00,
      locked_balance: 0.00,
      currency: "VES",
      is_locked: false,
    });

    return new Response(JSON.stringify({ success: true, public_id: publicId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
