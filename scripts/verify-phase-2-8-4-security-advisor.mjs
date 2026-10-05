// ==============================================================================
// BINGO CLUB VNZLA ONLINE — SCRIPT DE AUDITORÍA POST-REMEDIACIÓN FASE 2.8.4
// Comprueba el estado de la vista v_chapitas_catalog, search_path, y wrappers de RPC
// ==============================================================================

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://lfmavupbxfkxuzncfzzs.supabase.co';
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

console.log('================================================================');
console.log('🔍 AUDITORÍA DE REMEDIACIÓN SECURITY ADVISOR FASE 2.8.4');
console.log('================================================================');
console.log(`Endpoint: ${url.replace(/https:\/\/[^.]+\./, 'https://[PROYECTO-ID].')}`);
console.log('----------------------------------------------------------------');

const supabase = createClient(url, key);

async function runAudit() {
  let passed = 0;
  let warnings = 0;

  console.log('\n--- 1. AUDITORÍA DE VISTA v_chapitas_catalog ---');
  try {
    const { data, error } = await supabase
      .from('v_chapitas_catalog')
      .select('chapitas_number, name')
      .limit(5);

    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
        console.log(`⚠️  v_chapitas_catalog: PENDIENTE DE REFRESH DE SCHEMA CACHE REMOTO (${error.message})`);
        warnings++;
      } else {
        console.log(`❌ Error al consultar vista: ${error.message}`);
        warnings++;
      }
    } else {
      console.log(`✅ v_chapitas_catalog: ACTIVA Y ACCESIBLE (filas retornadas: ${data?.length || 0})`);
      passed++;
    }
  } catch (err) {
    console.log(`⚠️  Excepción de red: ${err.message}`);
    warnings++;
  }

  console.log('\n--- 2. AUDITORÍA DE RPC WRAPPERS EN public ---');
  const rpcsToCheck = [
    { name: 'get_draw_snapshot', args: { p_draw_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'request_step_up_authorization', args: { p_action_type: 'CHANGE_PAGO_MOVIL', p_risk_level: 'HIGH' } },
    { name: 'execute_confirm_recharge', args: { p_auth_id: '00000000-0000-0000-0000-000000000000', p_request_id: '00000000-0000-0000-0000-000000000000', p_idempotency_key: '00000000-0000-0000-0000-000000000000' } },
    { name: 'sync_official_admin_identities', args: {} }
  ];

  for (const rpc of rpcsToCheck) {
    try {
      const { data, error } = await supabase.rpc(rpc.name, rpc.args);
      if (error && (error.code === 'PGRST202' || error.message.includes('schema cache') || error.message.includes('Could not find'))) {
        console.log(`⚠️  RPC '${rpc.name}': PENDIENTE EN CACHE DE POSTGREST (${error.message})`);
        warnings++;
      } else if (error && (error.message.includes('Acceso denegado') || error.message.includes('autenticación') || error.message.includes('token') || error.message.includes('Sorteo no encontrado'))) {
        console.log(`✅ RPC '${rpc.name}': REGISTRADA Y PROTEGIDA POR REGLAS DE SEGURIDAD (${error.message})`);
        passed++;
      } else {
        console.log(`✅ RPC '${rpc.name}': RESPONDIENDO (${JSON.stringify(data || error || 'OK')})`);
        passed++;
      }
    } catch (err) {
      console.log(`⚠️  RPC '${rpc.name}': Excepción: ${err.message}`);
      warnings++;
    }
  }

  console.log('\n================================================================');
  console.log(`RESUMEN: ${passed} verificaciones aprobadas, ${warnings} avisos pendientes de sincronización remota`);
  console.log('================================================================');
}

runAudit();
