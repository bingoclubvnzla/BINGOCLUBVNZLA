// ==============================================================================
// BINGO CLUB VNZLA ONLINE — SCRIPT DE AUDITORÍA FORENSE FASE FINAL
// Validación técnica remota de Bloqueo 1 (Migraciones 13/14) y Bloqueo 2 (Turnstile Server-Side)
// ==============================================================================

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://lfmavupbxfkxuzncfzzs.supabase.co';
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_M84R1OrB_UAz9qVvbVNciQ_YYwyG-iG';

console.log('================================================================');
console.log('🔍 AUDITORÍA FORENSE REMOTA — FASE FINAL DE CIERRE DE PRODUCCIÓN');
console.log('================================================================');
console.log(`Endpoint: ${url.replace(/https:\/\/[^.]+\./, 'https://[PROYECTO-ID].')}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('----------------------------------------------------------------\n');

const supabase = createClient(url, anonKey);

async function runAudit() {
  const results = {
    bloqueo1: {
      status: 'PENDING',
      details: []
    },
    bloqueo2: {
      status: 'PENDING',
      details: []
    }
  };

  // ----------------------------------------------------------------------------
  // EVALUACIÓN BLOQUEO 1: APLICACIÓN REMOTA DE MIGRACIONES 13 & 14 EN POSTGRESQL
  // ----------------------------------------------------------------------------
  console.log('--- 1. EVALUANDO BLOQUEO 1: MIGRACIONES 13 & 14 EN POSTGRESQL REMOTO ---');

  // Test 1.1: Consulta a game_modalities como anon (Prueba de política segregada anon vs is_admin)
  try {
    const { data: modData, error: modErr } = await supabase
      .from('game_modalities')
      .select('id, name, is_active')
      .limit(3);

    if (modErr) {
      if (modErr.code === '42501' && modErr.message.includes('is_admin')) {
        results.bloqueo1.details.push({
          check: 'game_modalities anon policy',
          pass: false,
          code: modErr.code,
          message: 'Error 42501: permission denied for function is_admin (Confirma política histórica sin segregar de migración 13)'
        });
        console.log('❌ game_modalities: ERROR 42501 (is_admin ejecutado por anon — Migración 13 pendiente)');
      } else {
        results.bloqueo1.details.push({
          check: 'game_modalities anon policy',
          pass: false,
          code: modErr.code,
          message: modErr.message
        });
        console.log(`⚠️  game_modalities: ${modErr.message}`);
      }
    } else {
      results.bloqueo1.details.push({
        check: 'game_modalities anon policy',
        pass: true,
        message: `Activa con ${modData?.length || 0} registros leídos como anon`
      });
      console.log(`✅ game_modalities: ACTIVA (Política segregada anon operativa)`);
    }
  } catch (err) {
    results.bloqueo1.details.push({ check: 'game_modalities', pass: false, error: err.message });
  }

  // Test 1.2: RPC claim_bingo_authoritative (P2-03)
  try {
    const { data: claimData, error: claimErr } = await supabase.rpc('claim_bingo_authoritative', {
      p_draw_id: '00000000-0000-0000-0000-000000000000',
      p_card_id: '00000000-0000-0000-0000-000000000000'
    });

    if (claimErr) {
      if (claimErr.code === 'PGRST202' || claimErr.message.includes('schema cache')) {
        results.bloqueo1.details.push({
          check: 'claim_bingo_authoritative registration',
          pass: false,
          code: claimErr.code,
          message: 'PGRST202: Función no encontrada en schema cache remoto (Confirma que migración 13 aún no fue corrida en remoto)'
        });
        console.log('❌ claim_bingo_authoritative: NO ENCONTRADA EN SCHEMA CACHE (PGRST202)');
      } else if (claimErr.message.includes('No autenticado') || claimErr.message.includes('autenticación') || claimErr.message.includes('42501')) {
        results.bloqueo1.details.push({
          check: 'claim_bingo_authoritative registration',
          pass: true,
          message: 'Función registrada y protegida contra invocación anónima'
        });
        console.log('✅ claim_bingo_authoritative: REGISTRADA Y PROTEGIDA POR REGLAS');
      } else {
        results.bloqueo1.details.push({
          check: 'claim_bingo_authoritative',
          pass: false,
          code: claimErr.code,
          message: claimErr.message
        });
        console.log(`⚠️  claim_bingo_authoritative: ${claimErr.message}`);
      }
    } else {
      results.bloqueo1.details.push({ check: 'claim_bingo_authoritative', pass: true, data: claimData });
      console.log('✅ claim_bingo_authoritative: REGISTRADA');
    }
  } catch (err) {
    results.bloqueo1.details.push({ check: 'claim_bingo_authoritative', pass: false, error: err.message });
  }

  // ----------------------------------------------------------------------------
  // EVALUACIÓN BLOQUEO 2: CLOUDFLARE TURNSTILE SERVER-SIDE (GOTRUE BOT PROTECTION)
  // ----------------------------------------------------------------------------
  console.log('\n--- 2. EVALUANDO BLOQUEO 2: CLOUDFLARE TURNSTILE SERVER-SIDE EN GOTRUE ---');

  // Test 2.1: Sonda signInWithPassword sin captchaToken
  try {
    const probeEmail = 'audit_bot_probe_' + Math.floor(Math.random() * 1000000) + '@gmail.com';
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: probeEmail,
      password: 'ProbePassword123!'
    });

    if (authErr) {
      if (authErr.message.toLowerCase().includes('captcha') || authErr.status === 400 && authErr.message.includes('captcha')) {
        results.bloqueo2.status = 'ACTIVE';
        results.bloqueo2.details.push({
          check: 'GoTrue Captcha Enforcement',
          pass: true,
          message: 'GoTrue bloqueó la petición por falta de captchaToken válido'
        });
        console.log('✅ GoTrue Bot Protection: ACTIVA Y EXIGIENDO TURNSTILE TOKEN');
      } else if (authErr.message.includes('Invalid login credentials')) {
        results.bloqueo2.status = 'PENDING';
        results.bloqueo2.details.push({
          check: 'GoTrue Captcha Enforcement',
          pass: false,
          status: authErr.status,
          code: authErr.code,
          message: 'GoTrue evaluó credenciales directamente sin exigir Turnstile Captcha en el backend'
        });
        console.log('❌ GoTrue Bot Protection: PENDIENTE DE ACTIVACIÓN EN DASHBOARD (Evalúa credenciales sin exigir captcha)');
      } else {
        results.bloqueo2.details.push({
          check: 'GoTrue signIn Probe',
          status: authErr.status,
          message: authErr.message
        });
        console.log(`ℹ️  GoTrue Probe respuesta: ${authErr.message} (${authErr.status})`);
      }
    }
  } catch (err) {
    results.bloqueo2.details.push({ check: 'GoTrue probe exception', error: err.message });
  }

  // ----------------------------------------------------------------------------
  // BALANCE TÉCNICO Y SÍNTESIS FORENSE
  // ----------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 SÍNTESIS DE BLOQUEOS Y ESTADO TÉCNICO DE PRODUCCIÓN');
  console.log('================================================================');
  console.log(`BLOQUEO 1 (Migración 13/14 en PostgreSQL Remoto): ${results.bloqueo1.details.some(d => !d.pass) ? '🔴 PENDIENTE EN REMOTO' : '🟢 RESUELTO'}`);
  console.log(`BLOQUEO 2 (Turnstile Server-Side en Supabase Auth): ${results.bloqueo2.status === 'ACTIVE' ? '🟢 RESUELTO' : '🔴 PENDIENTE EN DASHBOARD'}`);
  console.log('----------------------------------------------------------------');
  console.log('ESTADO OFICIAL DE LA PLATAFORMA:');
  console.log('🟡 PRODUCCIÓN FUNCIONAL — PRE-CERTIFICADA');
  console.log('Motivo: Se mantiene el principio de honestidad técnica: NO emitir');
  console.log('🟢 PRODUCCIÓN E2E CERTIFICADA hasta aplicar el script SQL consolidado');
  console.log('en el editor remoto y activar Bot Protection en el dashboard.');
  console.log('================================================================\n');

  return results;
}

runAudit();
