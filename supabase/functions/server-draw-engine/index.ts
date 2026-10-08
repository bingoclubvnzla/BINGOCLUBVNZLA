// Supabase Edge Function: Server-Authoritative Draw Engine Stub
// Purpose: Documents and lays the backend foundation for future live draw execution.
// CRITICAL SECURITY PRINCIPLE: The browser NEVER generates, picks, or authorizes drawn balls.
// The draw sequence is determined and timestamped exclusively server-side.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // In Phase 1, financial and automatic betting logic is strictly inactive.
    return new Response(
      JSON.stringify({
        phase: 1,
        engine_status: 'FOUNDATION_READY',
        message: 'Motor de sorteo server-authoritative preparado para Fase 2. En Fase 1 no hay sorteos de dinero real.',
        authoritative: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
