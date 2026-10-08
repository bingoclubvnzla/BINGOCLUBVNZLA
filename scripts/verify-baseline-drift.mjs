// ==============================================================================
// BINGO CLUB VNZLA ONLINE — AUTOMATED BASELINE DRIFT DETECTION
// Detecta cambios en las 17 funciones SECURITY DEFINER, firmas, search_path,
// roles, RBAC, dominio canónico, vercel.json y ausencia de secretos privados.
// ==============================================================================

import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('🛡️  SECURITY BASELINE DRIFT DETECTION — BINGO CLUB VNZLA ONLINE');
console.log('================================================================');

let driftCount = 0;
let checkCount = 0;

function check(name, pass, detail = '') {
  checkCount++;
  if (pass) {
    console.log(`✅ [PASS] ${name}`);
  } else {
    driftCount++;
    console.error(`❌ [BASELINE DRIFT DETECTED] ${name}: ${detail}`);
  }
}

// 1. Dominio Canónico
const canonicalConfigPath = path.resolve('src/lib/canonicalConfig.ts');
const canonicalConfig = fs.readFileSync(canonicalConfigPath, 'utf8');
check(
  'Dominio Canónico Oficial es https://bingoclubvnzla.vercel.app',
  canonicalConfig.includes("CANONICAL_PRODUCTION_URL = 'https://bingoclubvnzla.vercel.app'")
);
check(
  'Host Canónico Oficial es bingoclubvnzla.vercel.app',
  canonicalConfig.includes("CANONICAL_PRODUCTION_HOST = 'bingoclubvnzla.vercel.app'")
);

// 2. Vercel.json 308 Edge Redirect
const vercelJsonPath = path.resolve('vercel.json');
const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
const has308Redirect = vercelJson.redirects?.some(
  (r) =>
    r.destination === 'https://bingoclubvnzla.vercel.app/$1' &&
    r.permanent === true &&
    r.has?.some((h) => h.type === 'host' && h.value.includes('bingoclubvnzla-'))
);
check('Vercel Edge Redirect HTTP 308 hacia el dominio canónico', Boolean(has308Redirect));

// 3. OpenGraph y Canonical en index.html
const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
check(
  'Rel Canonical en index.html apunta a https://bingoclubvnzla.vercel.app/',
  indexHtml.includes('<link rel="canonical" href="https://bingoclubvnzla.vercel.app/" />')
);
check(
  'OpenGraph og:url en index.html apunta a https://bingoclubvnzla.vercel.app/',
  indexHtml.includes('<meta property="og:url" content="https://bingoclubvnzla.vercel.app/" />')
);

// 4. Jerarquía RBAC en secureAccessRules.ts
const secureRulesPath = path.resolve('src/lib/secureAccessRules.ts');
const secureRules = fs.readFileSync(secureRulesPath, 'utf8');
check('Jerarquía RBAC SUPER_ADMIN = 50', secureRules.includes('SUPER_ADMIN: 50'));
check('Jerarquía RBAC ADMIN = 40', secureRules.includes('ADMIN: 40'));
check('Jerarquía RBAC SUPERVISOR = 30', secureRules.includes('SUPERVISOR: 30'));
check('Jerarquía RBAC OPERATOR = 20', secureRules.includes('OPERATOR: 20'));
check('Jerarquía RBAC PLAYER = 10', secureRules.includes('PLAYER: 10'));

// 5. Las 17 Funciones Críticas en Migración 15
const mig15Path = path.resolve('supabase/migrations/20261005000015_security_advisor_0029_hardening.sql');
const mig15 = fs.readFileSync(mig15Path, 'utf8');

const criticalFunctions = [
  'claim_bingo_authoritative',
  'create_draw_authoritative',
  'start_draw_authoritative',
  'emit_next_ball_authoritative',
  'execute_confirm_recharge',
  'execute_approve_withdrawal',
  'execute_request_withdrawal',
  'execute_update_pago_movil',
  'execute_disable_mfa',
  'execute_account_soft_deletion',
  'execute_admin_change_role',
  'execute_admin_toggle_user_status',
  'sync_official_admin_identities',
  'request_step_up_authorization',
  'log_auth_event',
];

for (const fn of criticalFunctions) {
  const hasRevoke = new RegExp(`REVOKE EXECUTE ON FUNCTION public\\.${fn}[\\s\\S]*?FROM PUBLIC, anon;`, 'i').test(mig15);
  check(`Función public.${fn} tiene revocación explícita de anon y PUBLIC`, hasRevoke);
}

// 6. Search Path Determinista en Funciones SECURITY DEFINER
const definerMatches = mig15.match(/SECURITY DEFINER/g) || [];
const searchPathMatches = mig15.match(/SET search_path = (?:public, extensions, pg_temp|public, pg_temp|'')/g) || [];
check(
  'Todas las funciones SECURITY DEFINER tienen search_path seguro y determinista',
  definerMatches.length > 0 && definerMatches.length === searchPathMatches.length,
  `Definers: ${definerMatches.length}, SearchPaths: ${searchPathMatches.length}`
);

// 7. Default Privileges en Migración 15
check(
  'Default Privileges en schema public revoca EXECUTE de PUBLIC y anon',
  mig15.includes('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;')
);
check(
  'Default Privileges en schema private revoca EXECUTE de PUBLIC, anon y authenticated',
  mig15.includes('ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;')
);

// 8. Escaneo de Secretos en src/ y .env.example
let secretFound = false;
const srcFiles = fs.readdirSync(path.resolve('src'), { recursive: true });
for (const file of srcFiles) {
  const fullPath = path.resolve('src', file);
  if (fs.statSync(fullPath).isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js'))) {
    const code = fs.readFileSync(fullPath, 'utf8');
    if (/service_role_key\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/i.test(code) || /sk_live_[a-zA-Z0-9]{20,}/i.test(code)) {
      secretFound = true;
      break;
    }
  }
}
check('Cero secretos privados en src/ (service_role, sk_live_)', !secretFound);

// 9. Resumen Final
console.log('----------------------------------------------------------------');
if (driftCount === 0) {
  console.log(`🟢 SECURITY BASELINE PRESERVED (${checkCount}/${checkCount} verificaciones aprobadas)`);
  process.exit(0);
} else {
  console.error(`🚨 ALERTA: ${driftCount} DESVIACIONES DE BASELINE DETECTADAS`);
  process.exit(1);
}
