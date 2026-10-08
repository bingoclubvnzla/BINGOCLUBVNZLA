// Supabase Edge Function: Auth & Profile Integrity Auditor
// Runs server-side with Deno/TypeScript in Supabase Edge Runtime
// Purpose: Validates auth events, writes audit_logs, prevents client-side role forgery.

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Falta cabecera de autorización' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Sesión no válida o expirada' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, entity_type, entity_id, metadata } = await req.json();

    // Fetch user profile to read verified role from PostgreSQL
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const actor_role = profile?.role ?? 'PLAYER';

    // Insert tamper-proof audit record
    const { error: insertError } = await supabaseClient.from('audit_logs').insert({
      user_id: user.id,
      actor_role,
      action: action ?? 'CLIENT_AUDIT_PING',
      entity_type: entity_type ?? 'SESSION',
      entity_id: entity_id ?? user.id,
      metadata: {
        ...metadata,
        client_timestamp: new Date().toISOString(),
      },
    });

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({ success: true, user_id: user.id, verified_role: actor_role }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno de auditoría' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
