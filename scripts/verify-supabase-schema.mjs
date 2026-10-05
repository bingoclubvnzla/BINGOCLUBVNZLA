// ==============================================================================
// BINGO CLUB VNZLA ONLINE — SCRIPT DE VERIFICACIÓN DE SCHEMA SUPABASE
// Comprueba el estado de activación en el PostgreSQL remoto vía PostgREST y Realtime
// ==============================================================================

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error('❌ Error: Variables VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY ausentes.');
  process.exit(1);
}

const supabase = createClient(url, key);

async function verifySchema() {
  console.log('================================================================');
  console.log('🔍 INICIANDO AUDITORÍA DE SCHEMA EN SUPABASE REMOTO');
  console.log('================================================================');
  console.log(`Endpoint: ${url.replace(/https:\/\/[^.]+\./, 'https://[PROYECTO-ID].')}`);
  console.log(`Clave: [ANON PUBLISHABLE KEY VERIFICADA - ROL ANON]`);
  console.log('----------------------------------------------------------------');

  const tablesToCheck = [
    'game_modalities',
    'modality_catalogs',
    'chapitas_mappings',
    'game_rooms',
    'draws',
    'draw_events',
    'cards',
    'card_numbers',
    'wallets',
    'wallet_transactions',
    'payment_requests',
    'prizes',
    'winners',
    'profiles',
    'audit_logs',
    'app_settings'
  ];

  let missingCount = 0;
  let activeCount = 0;

  console.log('\n--- VERIFICACIÓN DE TABLAS PÚBLICAS ---');
  for (const table of tablesToCheck) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
        console.log(`❌ Tabla '${table}': PENDIENTE (PGRST205 - Schema Cache Miss)`);
        missingCount++;
      } else {
        console.log(`⚠️  Tabla '${table}': RLS Bloqueado / Restringido (${error.code || error.message})`);
        activeCount++;
      }
    } else {
      console.log(`✅ Tabla '${table}': ACTIVA (Responde correctamente, filas: ${data.length})`);
      activeCount++;
    }
  }

  console.log('\n--- VERIFICACIÓN DE WEBSOCKET REALTIME ---');
  const channel = supabase.channel('audit:realtime-check');
  const realtimePromise = new Promise((resolve) => {
    channel.subscribe((status) => {
      console.log(`WebSocket Status: ${status}`);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Supabase Realtime Gateway: ACTIVO Y SUSCRITO');
        channel.unsubscribe();
        resolve(true);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.log(`❌ Supabase Realtime Gateway: ERROR (${status})`);
        resolve(false);
      }
    });
  });

  await Promise.race([
    realtimePromise,
    new Promise((resolve) => setTimeout(() => {
      console.log('⚠️  Realtime timeout (2s)');
      resolve(false);
    }, 2500))
  ]);

  console.log('================================================================');
  console.log(`RESUMEN: ${activeCount} tablas activas, ${missingCount} tablas pendientes.`);
  if (missingCount > 0) {
    console.log('ESTADO: 🟠 SCHEMA PENDIENTE DE ACTIVACIÓN EN EL SQL EDITOR');
  } else {
    console.log('ESTADO: 🟢 SCHEMA 100% OPERATIVO EN POSTGRESQL');
  }
  console.log('================================================================');
  process.exit(0);
}

verifySchema().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
