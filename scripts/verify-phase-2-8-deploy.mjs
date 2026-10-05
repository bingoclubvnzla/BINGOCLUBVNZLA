// ==============================================================================
// BINGO CLUB VNZLA ONLINE — SCRIPT DE AUDITORÍA POST-DEPLOY FASE 2.8 / 2.9 (MIGRACIONES 09-11)
// Comprueba el estado real de step_up_authorizations, RPCs financieras y columnas de profiles
// ==============================================================================

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://lfmavupbxfkxuzncfzzs.supabase.co';
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

const supabase = createClient(url, key);

async function verifyPhase28Deploy() {
  console.log('================================================================');
  console.log('🔍 AUDITORÍA DE MIGRACIONES 09, 10 & 11 EN SUPABASE REMOTO');
  console.log('================================================================');
  console.log(`Endpoint: ${url.replace(/https:\/\/[^.]+\./, 'https://[PROYECTO-ID].')}`);
  console.log('----------------------------------------------------------------');

  let passedChecks = 0;
  let pendingChecks = 0;

  // 1. Tabla step_up_authorizations
  const { data: stepUpData, error: stepUpErr } = await supabase
    .from('step_up_authorizations')
    .select('*')
    .limit(1);

  if (stepUpErr) {
    console.log(`❌ Tabla 'step_up_authorizations': PENDIENTE (${stepUpErr.message})`);
    pendingChecks++;
  } else {
    console.log(`✅ Tabla 'step_up_authorizations': ACTIVA (filas: ${stepUpData.length})`);
    passedChecks++;
  }

  // 2. Columnas en public.profiles
  const { data: profData, error: profErr } = await supabase
    .from('profiles')
    .select('id, mfa_enabled, financial_cooldown_until, pago_movil_phone, pago_movil_bank')
    .limit(1);

  if (profErr) {
    console.log(`❌ Columnas MFA/Financieras en 'profiles': PENDIENTES (${profErr.message})`);
    pendingChecks++;
  } else {
    console.log(`✅ Columnas MFA/Financieras en 'profiles': ACTIVAS`);
    passedChecks++;
  }

  // 3. RPC request_step_up_authorization
  const { error: rpcStepUpErr } = await supabase.rpc('request_step_up_authorization', {
    p_action_type: 'CHANGE_PAGO_MOVIL',
    p_risk_level: 'HIGH'
  });

  if (rpcStepUpErr && rpcStepUpErr.message.includes('schema cache')) {
    console.log(`❌ RPC 'request_step_up_authorization': PENDIENTE`);
    pendingChecks++;
  } else {
    console.log(`✅ RPC 'request_step_up_authorization': REGISTRADA EN POSTGREST`);
    passedChecks++;
  }

  // 4. RPC execute_confirm_recharge
  const { error: rpcRechargeErr } = await supabase.rpc('execute_confirm_recharge', {
    p_auth_id: '00000000-0000-0000-0000-000000000000',
    p_request_id: '00000000-0000-0000-0000-000000000000',
    p_idempotency_key: '00000000-0000-0000-0000-000000000000'
  });

  if (rpcRechargeErr && rpcRechargeErr.message.includes('schema cache')) {
    console.log(`❌ RPC 'execute_confirm_recharge': PENDIENTE`);
    pendingChecks++;
  } else {
    console.log(`✅ RPC 'execute_confirm_recharge': REGISTRADA EN POSTGREST`);
    passedChecks++;
  }

  // 5. RPC execute_approve_withdrawal
  const { error: rpcWithdrawErr } = await supabase.rpc('execute_approve_withdrawal', {
    p_auth_id: '00000000-0000-0000-0000-000000000000',
    p_request_id: '00000000-0000-0000-0000-000000000000',
    p_idempotency_key: '00000000-0000-0000-0000-000000000000'
  });

  if (rpcWithdrawErr && rpcWithdrawErr.message.includes('schema cache')) {
    console.log(`❌ RPC 'execute_approve_withdrawal': PENDIENTE`);
    pendingChecks++;
  } else {
    console.log(`✅ RPC 'execute_approve_withdrawal': REGISTRADA EN POSTGREST`);
    passedChecks++;
  }

  // 6. RPC execute_disable_mfa
  const { error: rpcMfaErr } = await supabase.rpc('execute_disable_mfa', {
    p_auth_id: '00000000-0000-0000-0000-000000000000',
    p_factor_id: 'test'
  });

  if (rpcMfaErr && rpcMfaErr.message.includes('schema cache')) {
    console.log(`❌ RPC 'execute_disable_mfa': PENDIENTE`);
    pendingChecks++;
  } else {
    console.log(`✅ RPC 'execute_disable_mfa': REGISTRADA EN POSTGREST`);
    passedChecks++;
  }

  // 7. RPC sync_official_admin_identities
  const { error: rpcSyncErr } = await supabase.rpc('sync_official_admin_identities');

  if (rpcSyncErr && rpcSyncErr.message.includes('schema cache')) {
    console.log(`❌ RPC 'sync_official_admin_identities': PENDIENTE`);
    pendingChecks++;
  } else {
    console.log(`✅ RPC 'sync_official_admin_identities': REGISTRADA EN POSTGREST`);
    passedChecks++;
  }

  console.log('================================================================');
  console.log(`RESUMEN FASE 2.8/2.9: ${passedChecks} componentes activos, ${pendingChecks} componentes pendientes.`);
  if (pendingChecks > 0) {
    console.log('ESTADO: 🟠 MIGRACIONES 09, 10 Y 11 PENDIENTES DE EJECUCIÓN EN EL SQL EDITOR');
    console.log('ACCION: Copie y ejecute supabase/PHASE_2_8_AND_2_9_MIGRATION_DEPLOY.sql en Supabase');
  } else {
    console.log('ESTADO: 🟢 MIGRACIONES 09, 10 Y 11 100% OPERATIVAS EN POSTGRESQL');
  }
  console.log('================================================================');
}

verifyPhase28Deploy().catch((err) => {
  console.error('Error fatal durante la verificación:', err);
  process.exit(1);
});
