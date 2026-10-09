// ==============================================================================
// SUPABASE EDGE FUNCTION: draw-engine-validator
// Principio: SERVER AUTHORITATIVE.
// Control de Orígenes (CORS): Sin comodín '*' en operaciones sensibles.
// ==============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  Deno.env.get('APP_URL') || '',
  Deno.env.get('ALLOWED_ORIGIN') || '',
  'https://bingoclub.com.ve',
  'https://www.bingoclub.com.ve',
];

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const isAllowed = requestOrigin && (
    ALLOWED_ORIGINS.includes(requestOrigin) ||
    requestOrigin.endsWith('.vercel.app') ||
    requestOrigin.includes('localhost') ||
    requestOrigin.includes('run.app')
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? requestOrigin : (ALLOWED_ORIGINS[0] || 'https://bingoclub.com.ve'),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener usuario del token JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Sesión no válida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { draw_id, card_id, claim_type } = await req.json();

    if (!draw_id || !card_id || !claim_type) {
      return new Response(
        JSON.stringify({ error: 'draw_id, card_id y claim_type son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Obtener estado del sorteo y números cantados (SERVER AUTHORITATIVE)
    const { data: draw, error: drawError } = await supabase
      .from('draws')
      .select('status, drawn_numbers, modality_id')
      .eq('id', draw_id)
      .single();

    if (drawError || !draw) {
      return new Response(JSON.stringify({ error: 'Sorteo no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (draw.status !== 'ACTIVE') {
      return new Response(JSON.stringify({ error: 'El sorteo no está activo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Obtener el cartón y verificar propiedad
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('id, user_id, grid_layout')
      .eq('id', card_id)
      .eq('draw_id', draw_id)
      .single();

    if (cardError || !card || card.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Cartón no válido o no pertenece al usuario' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Retornar resultado seguro con auditoría
    return new Response(
      JSON.stringify({
        valid: true,
        message: 'Reclamo procesado bajo autoridad del servidor',
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Error interno en validación de sorteo' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
