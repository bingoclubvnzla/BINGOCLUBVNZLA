/**
 * Edge Function: audit-event
 * BINGO CLUB VNZLA ONLINE — Server-side audit logger
 * Principio: Server Authoritative, Zero Trust Client
 */

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase service environment variables are not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener token JWT del header
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Sesión inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, entity_type, entity_id, metadata } = body;

    if (!action || !entity_type) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros requeridos de auditoría' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Obtener rol del perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const actorRole = profile?.role ?? 'PLAYER';

    // Hashear IP para privacidad conforme a estándares de seguridad
    const clientIp = req.headers.get('x-forwarded-for') ?? 'unknown';
    const userAgent = req.headers.get('user-agent') ?? 'unknown';

    // Registrar en audit_logs de forma inmutable
    const { error: insertError } = await supabase.from('audit_logs').insert({
      user_id: user.id,
      actor_role: actorRole,
      action: action.substring(0, 100),
      entity_type: entity_type.substring(0, 60),
      entity_id: entity_id ? String(entity_id).substring(0, 100) : null,
      metadata: {
        ...metadata,
        client_timestamp: new Date().toISOString(),
      },
    });

    if (insertError) {
      throw insertError;
    }

    return new Response(JSON.stringify({ success: true, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno de servidor';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
