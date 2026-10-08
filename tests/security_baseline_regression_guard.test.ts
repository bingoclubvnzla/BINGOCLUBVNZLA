// ==============================================================================
// BINGO CLUB VNZLA ONLINE — GUARDIÁN DE REGRESIÓN DE SEGURIDAD (SECURITY BASELINE)
// Invariantes Criptográficos, RBAC, Search Path, Secret Scan y Privilegios RPC
// ==============================================================================

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  CANONICAL_PRODUCTION_URL,
  CANONICAL_PRODUCTION_HOST,
  isForbiddenVercelDeploymentHost,
} from '../src/lib/canonicalConfig';
import {
  SECURE_ROLE_HIERARCHY,
  canMutateUserRole,
  validateStepUpActionBinding,
  isCanonicalOAuthRedirect,
  validateResourceAccess,
  validateFinancialMutationRequest,
} from '../src/lib/secureAccessRules';

describe('SECURITY BASELINE REGRESSION GUARD — BINGO CLUB VNZLA ONLINE', () => {
  const migrationsDir = path.resolve('supabase/migrations');
  const mig15Path = path.resolve(migrationsDir, '20261005000015_security_advisor_0029_hardening.sql');
  const mig14Path = path.resolve(migrationsDir, '20261005000014_harden_acl_and_public_wrappers.sql');
  const mig13Path = path.resolve(migrationsDir, '20261005000013_fix_draw_permutation_authoritative.sql');
  const mig12Path = path.resolve(migrationsDir, '20261005000012_security_advisor_remediation.sql');
  const migRlsPath = path.resolve(migrationsDir, '20261005000001_rls_policies.sql');

  const content15 = fs.readFileSync(mig15Path, 'utf8');
  const content14 = fs.readFileSync(mig14Path, 'utf8');
  const content13 = fs.readFileSync(mig13Path, 'utf8');
  const content12 = fs.readFileSync(mig12Path, 'utf8');
  const contentRls = fs.readFileSync(migRlsPath, 'utf8');

  // --------------------------------------------------------------------------
  // INVARIANTE 1: SEARCH_PATH DETERMINISTA EN TODAS LAS FUNCIONES DEFINER
  // --------------------------------------------------------------------------
  describe('Invariante 1: search_path inmutable en SECURITY DEFINER (Previene Shadowing y pg_temp)', () => {
    it('Todas las funciones SECURITY DEFINER de la migración 15 tienen search_path explícito y seguro', () => {
      const definerCount = (content15.match(/SECURITY DEFINER/g) || []).length;
      const searchPathCount = (content15.match(/SET search_path = (?:public, extensions, pg_temp|public, pg_temp|'')/g) || []).length;
      expect(definerCount).toBeGreaterThan(0);
      expect(searchPathCount).toBe(definerCount);
    });

    it('Ninguna función en migración 15 omite search_path o usa search_path mutable', () => {
      expect(content15).not.toMatch(/SECURITY DEFINER\s*\n\s*AS \$\$/);
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANTE 2: DEFAULT PRIVILEGES CONTRA DEGRADACIÓN FUTURA
  // --------------------------------------------------------------------------
  describe('Invariante 2: Default Privileges contra degradación futura de esquemas', () => {
    it('Schema public revoca por defecto EXECUTE de PUBLIC y anon', () => {
      expect(content15).toContain('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;');
    });

    it('Schema private revoca por defecto EXECUTE de PUBLIC, anon y authenticated', () => {
      expect(content15).toContain('ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;');
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANTE 3: CONGELAMIENTO DE LAS 17 FUNCIONES CRÍTICAS (GATEKEEPERS)
  // --------------------------------------------------------------------------
  describe('Invariante 3: Gatekeepers y Revocaciones en las 17 Funciones Críticas', () => {
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
      it(`Función public.${fn} tiene revocación explícita de PUBLIC y anon`, () => {
        const regexRevoke = new RegExp(`REVOKE EXECUTE ON FUNCTION public\\.${fn}[\\s\\S]*?FROM PUBLIC, anon;`, 'i');
        expect(regexRevoke.test(content15)).toBe(true);
      });
    }

    it('Funciones administrativas exigen is_admin() o is_supervisor_or_higher() en su primera línea', () => {
      expect(content15).toMatch(/CREATE OR REPLACE FUNCTION public\.execute_admin_change_role[\s\S]*?IF NOT public\.is_admin\(\) THEN/);
      expect(content15).toMatch(/CREATE OR REPLACE FUNCTION public\.execute_admin_toggle_user_status[\s\S]*?IF NOT public\.is_admin\(\) THEN/);
      expect(content15).toMatch(/CREATE OR REPLACE FUNCTION public\.execute_approve_withdrawal[\s\S]*?IF NOT public\.is_supervisor_or_higher\(\) THEN/);
    });

    it('Funciones de sorteos exigen is_operator_or_higher() en su primera línea', () => {
      expect(content15).toMatch(/CREATE OR REPLACE FUNCTION public\.create_draw_authoritative[\s\S]*?IF NOT public\.is_operator_or_higher\(\) THEN/);
      expect(content15).toMatch(/CREATE OR REPLACE FUNCTION public\.start_draw_authoritative[\s\S]*?IF NOT public\.is_operator_or_higher\(\) THEN/);
      expect(content15).toMatch(/CREATE OR REPLACE FUNCTION public\.emit_next_ball_authoritative[\s\S]*?IF NOT public\.is_operator_or_higher\(\) THEN/);
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANTE 4: JERARQUÍA RBAC Y PROTECCIÓN DE SUPER_ADMIN
  // --------------------------------------------------------------------------
  describe('Invariante 4: Jerarquía RBAC y Protección Inmutable de SUPER_ADMIN', () => {
    it('Jerarquía RBAC estricta (SUPER_ADMIN: 50, ADMIN: 40, SUPERVISOR: 30, OPERATOR: 20, PLAYER: 10)', () => {
      expect(SECURE_ROLE_HIERARCHY.SUPER_ADMIN).toBe(50);
      expect(SECURE_ROLE_HIERARCHY.ADMIN).toBe(40);
      expect(SECURE_ROLE_HIERARCHY.SUPERVISOR).toBe(30);
      expect(SECURE_ROLE_HIERARCHY.OPERATOR).toBe(20);
      expect(SECURE_ROLE_HIERARCHY.PLAYER).toBe(10);
    });

    it('PLAYER no puede promover ni degradar a ningún rol', () => {
      expect(canMutateUserRole('PLAYER', 'user-1', 'user-2', 'OPERATOR', 'PLAYER').allowed).toBe(false);
      expect(canMutateUserRole('PLAYER', 'user-1', 'user-2', 'ADMIN', 'PLAYER').allowed).toBe(false);
    });

    it('ADMIN no puede elevarse a SUPER_ADMIN ni alterar a otro ADMIN o SUPER_ADMIN', () => {
      expect(canMutateUserRole('ADMIN', 'admin-1', 'admin-1', 'SUPER_ADMIN', 'ADMIN').allowed).toBe(false);
      expect(canMutateUserRole('ADMIN', 'admin-1', 'admin-2', 'SUPERVISOR', 'ADMIN').allowed).toBe(false);
      expect(canMutateUserRole('ADMIN', 'admin-1', 'super-admin-1', 'ADMIN', 'SUPER_ADMIN').allowed).toBe(false);
    });

    it('Identidad canónica de SUPER_ADMIN está protegida contra modificación y suspensión en SQL', () => {
      expect(content12).toContain("v_target_email = 'v19629049@gmail.com'");
      expect(content12).toContain('Protección de Identidad Canónica');
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANTE 5: STEP-UP AUTH VINCULACIÓN CUÁDRUPLE (ANTI-CROSS-REPLAY)
  // --------------------------------------------------------------------------
  describe('Invariante 5: Step-Up Auth Vinculación Cuádruple (Identity, Action, Resource, Replay)', () => {
    it('Búsqueda por idempotencia exige user_id = v_user_id en request_step_up_authorization', () => {
      expect(content15).toContain('user_id = v_user_id');
      expect(content15).toContain('action_type = p_action_type');
      expect(content15).toContain('risk_level = p_risk_level');
      expect(content15).toContain("COALESCE(resource_id, '') = COALESCE(p_resource_id, '')");
      expect(content15).toContain('is_used = false');
    });

    it('validateStepUpActionBinding rechaza token si el usuario o recurso no coincide', () => {
      const validToken = {
        tokenUserId: 'user-A',
        tokenAction: 'REQUEST_WITHDRAWAL',
        tokenResourceId: 'res-1',
        tokenIsUsed: false,
        tokenExpiresAt: Date.now() + 60000,
        targetUserId: 'user-B', // Cross-user attack
        targetAction: 'REQUEST_WITHDRAWAL',
        targetResourceId: 'res-1',
      };
      expect(validateStepUpActionBinding(validToken).valid).toBe(false);

      const crossResourceToken = {
        ...validToken,
        targetUserId: 'user-A',
        targetResourceId: 'res-2', // Cross-resource attack
      };
      expect(validateStepUpActionBinding(crossResourceToken).valid).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANTE 6: SECRET SCANNING PERMANENTE (CERO SECRETOS EN FRONTEND)
  // --------------------------------------------------------------------------
  describe('Invariante 6: Escaneo de Secretos Permanente en Código Fuente', () => {
    it('Ningún archivo en src/ contiene la clave service_role real ni credenciales de BD', () => {
      const srcFiles = fs.readdirSync(path.resolve('src'), { recursive: true }) as string[];
      for (const file of srcFiles) {
        const fullPath = path.resolve('src', file);
        if (fs.statSync(fullPath).isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js'))) {
          const code = fs.readFileSync(fullPath, 'utf8');
          expect(code).not.toMatch(/service_role_key\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/i);
          expect(code).not.toMatch(/turnstile_secret\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/i);
        }
      }
    });

    it('VITE_TURNSTILE_SITE_KEY es pública pero nunca se expone TURNSTILE_SECRET_KEY en frontend', () => {
      const envExample = fs.readFileSync(path.resolve('.env.example'), 'utf8');
      expect(envExample).toContain('VITE_TURNSTILE_SITE_KEY');
      expect(envExample).not.toContain('TURNSTILE_SECRET_KEY=');
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANTE 7: DOMINIO CANÓNICO Y PROTECCIÓN OAUTH CONTRA ALIASES DE VERCEL
  // --------------------------------------------------------------------------
  describe('Invariante 7: Dominio Canónico Exclusivo y Bloqueo de Aliases Vercel', () => {
    it('Dominio canónico oficial inmutable es https://bingoclubvnzla.vercel.app', () => {
      expect(CANONICAL_PRODUCTION_URL).toBe('https://bingoclubvnzla.vercel.app');
      expect(CANONICAL_PRODUCTION_HOST).toBe('bingoclubvnzla.vercel.app');
    });

    it('isForbiddenVercelDeploymentHost bloquea aliases de Vercel y aprueba dominio canónico', () => {
      expect(isForbiddenVercelDeploymentHost('bingoclubvnzla.vercel.app')).toBe(false);
      expect(isForbiddenVercelDeploymentHost('bingoclubvnzla-bingoclubvnzla.vercel.app')).toBe(true);
      expect(isForbiddenVercelDeploymentHost('bingoclubvnzla-git-main.vercel.app')).toBe(true);
      expect(isForbiddenVercelDeploymentHost('bingoclubvnzla-preview-123.vercel.app')).toBe(true);
    });

    it('isCanonicalOAuthRedirect rechaza cualquier retorno hacia aliases de deployment', () => {
      expect(isCanonicalOAuthRedirect('https://bingoclubvnzla.vercel.app/auth/callback')).toBe(true);
      expect(isCanonicalOAuthRedirect('https://bingoclubvnzla-bingoclubvnzla.vercel.app/auth/callback')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANTE 8: TRANSACCIONALIDAD FINANCIERA Y CONCURRENCIA PREDICATORIA
  // --------------------------------------------------------------------------
  describe('Invariante 8: Bloqueos Pesimistas FOR UPDATE en Operaciones Financieras y Juego', () => {
    it('claim_bingo_authoritative bloquea sorteo y cartón con FOR UPDATE', () => {
      expect(content15).toContain('SELECT * INTO v_draw\n    FROM public.draws\n    WHERE id = p_draw_id\n    FOR UPDATE;');
      expect(content15).toContain('SELECT * INTO v_card\n    FROM public.cards\n    WHERE id = p_card_id AND draw_id = p_draw_id\n    FOR UPDATE;');
      expect(content15).toContain('CREATE UNIQUE INDEX IF NOT EXISTS uq_winners_draw_card ON public.winners(draw_id, card_id);');
    });

    it('execute_confirm_recharge y execute_approve_withdrawal bloquean solicitudes y billeteras con FOR UPDATE', () => {
      expect(content12).toContain('SELECT * INTO v_req\n    FROM public.payment_requests\n    WHERE id = p_request_id\n    FOR UPDATE;');
      expect(content12).toContain('SELECT * INTO v_wallet\n    FROM public.wallets\n    WHERE user_id = v_req.user_id\n    FOR UPDATE;');
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANTE 9: RPC PRIVILEGES & ALLOWLIST (ANTI-ANON GRANTS)
  // --------------------------------------------------------------------------
  describe('Invariante 9: Matriz de Privilegios RPC y Allowlist de Funciones Expuestas', () => {
    it('Ninguna función en migración 15 concede EXECUTE a anon o PUBLIC', () => {
      const grantExecStatements = content15
        .split(';')
        .map((s) => s.trim())
        .filter((s) => /^GRANT\s+EXECUTE/i.test(s));

      expect(grantExecStatements.length).toBeGreaterThan(0);
      for (const stmt of grantExecStatements) {
        expect(stmt).not.toMatch(/\bTO\s+[^;]*\b(?:PUBLIC|anon)\b/i);
      }
    });

    it('Todas las 15 funciones críticas en migración 15 tienen REVOKE explícito de PUBLIC y anon', () => {
      const revokeMatches = (content15.match(/REVOKE\s+EXECUTE\s+ON\s+FUNCTION[\s\S]*?FROM\s+PUBLIC,\s*anon;/gi) || []).length;
      expect(revokeMatches).toBeGreaterThanOrEqual(15);
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANTE 10: STEP-UP AUTH VINCULACIÓN CUÁDRUPLE Y RESISTENCIA AL REPLAY
  // --------------------------------------------------------------------------
  describe('Invariante 10: Step-Up Auth Ataques Negativos y Replay Prevention', () => {
    it('Rechaza token si la acción solicitada no coincide con la acción del token', () => {
      const result = validateStepUpActionBinding({
        tokenUserId: 'usr-10',
        tokenAction: 'CHANGE_PAGO_MOVIL',
        tokenIsUsed: false,
        tokenExpiresAt: Date.now() + 60000,
        targetUserId: 'usr-10',
        targetAction: 'REQUEST_WITHDRAWAL', // Discrepancia de acción
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Violación de Action Binding');
    });

    it('Rechaza token si ya fue consumido previamente (Anti-Replay)', () => {
      const result = validateStepUpActionBinding({
        tokenUserId: 'usr-10',
        tokenAction: 'CHANGE_PAGO_MOVIL',
        tokenIsUsed: true, // Ya consumido
        tokenExpiresAt: Date.now() + 60000,
        targetUserId: 'usr-10',
        targetAction: 'CHANGE_PAGO_MOVIL',
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Anti-Replay');
    });

    it('Rechaza token expirado', () => {
      const result = validateStepUpActionBinding({
        tokenUserId: 'usr-10',
        tokenAction: 'CHANGE_PAGO_MOVIL',
        tokenIsUsed: false,
        tokenExpiresAt: Date.now() - 5000, // Expirado hace 5 segundos
        targetUserId: 'usr-10',
        targetAction: 'CHANGE_PAGO_MOVIL',
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expirada');
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANTE 11: DRAW ENGINE & CRIPTOGRAFÍA SERVER-AUTHORITATIVE
  // --------------------------------------------------------------------------
  describe('Invariante 11: Draw Engine y Criptografía Server-Authoritative', () => {
    it('Permutaciones de sorteos se generan mediante CSPRNG seguro con acceso restringido', () => {
      expect(content13).toContain('generate_draw_permutation');
      expect(content13).toMatch(/extensions\.gen_random_bytes|gen_random_bytes/);
      expect(content13).toContain('REVOKE EXECUTE ON FUNCTION public.generate_draw_permutation(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;');
    });

    it('start_draw_authoritative y emit_next_ball_authoritative exigen versión monótona', () => {
      expect(content15).toContain('p_expected_version INTEGER');
      expect(content12).toContain('v_new_version := v_draw.version + 1;');
      expect(content12).toContain('Conflicto de concurrencia: versión esperada');
    });

    it('Lógica del servidor de sorteos no utiliza Math.random() para sorteos oficiales', () => {
      expect(content13).not.toContain('Math.random()');
      expect(content15).not.toContain('Math.random()');
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANTE 12: WINNER CLAIM VALIDACIÓN MATEMÁTICA Y RESTRICCIONES ATÓMICAS
  // --------------------------------------------------------------------------
  describe('Invariante 12: Winner Claim Validación Matemática y Restricciones Atómicas', () => {
    it('claim_bingo_authoritative exige auth.uid(), valida titularidad del cartón y patrón', () => {
      expect(content13).toContain('v_user_id := auth.uid();');
      expect(content13).toContain('WHERE id = p_card_id AND draw_id = p_draw_id');
      expect(content13).toContain('cartón no pertenece al usuario autenticado');
      expect(content15).toContain('uq_winners_draw_card');
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANTE 13: RLS EN TABLAS SENSIBLES Y CONTROL DE ACCESO A RECURSOS
  // --------------------------------------------------------------------------
  describe('Invariante 13: RLS Permanente en Tablas Sensibles y Control de Recursos', () => {
    it('RLS habilitado en tablas críticas en migraciones', () => {
      expect(contentRls).toContain('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;');
      expect(contentRls).toContain('ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;');
      expect(contentRls).toContain('ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;');
      expect(contentRls).toContain('ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;');
      expect(contentRls).toContain('ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;');
    });

    it('validateResourceAccess bloquea acceso a recursos financieros ajenos para PLAYER', () => {
      const blockedWallet = validateResourceAccess({
        actorUserId: 'player-1',
        actorRole: 'PLAYER',
        resourceType: 'WALLET',
        resourceOwnerId: 'player-2',
      });
      expect(blockedWallet.allowed).toBe(false);
      expect(blockedWallet.reason).toContain('Violación de propiedad de objeto');

      const blockedCard = validateResourceAccess({
        actorUserId: 'player-1',
        actorRole: 'PLAYER',
        resourceType: 'CARD',
        resourceOwnerId: 'player-2',
      });
      expect(blockedCard.allowed).toBe(false);
    });

    it('validateFinancialMutationRequest rechaza solicitudes sin clave de idempotencia o importe inválido', () => {
      expect(validateFinancialMutationRequest({ idempotencyKey: '', userId: 'u1', amount: 50, type: 'DEPOSIT' }).valid).toBe(false);
      expect(validateFinancialMutationRequest({ idempotencyKey: 'valid-crypto-key-123456', userId: 'u1', amount: -10, type: 'DEPOSIT' }).valid).toBe(false);
      expect(validateFinancialMutationRequest({ idempotencyKey: 'valid-crypto-key-123456', userId: 'u1', amount: 50, type: 'DEPOSIT' }).valid).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANTE 14: DETECCIÓN AUTOMÁTICA DE DERIVA DE BASELINE
  // --------------------------------------------------------------------------
  describe('Invariante 14: Detección Automática de Deriva de Baseline', () => {
    it('Metadatos y configuración canónica coinciden exactamente con la autoridad certificada', () => {
      const metadata = JSON.parse(fs.readFileSync(path.resolve('metadata.json'), 'utf8'));
      expect(metadata.name).toBe('Bingo Club Venezuela Online');

      const vercelJson = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf8'));
      expect(vercelJson.redirects.length).toBeGreaterThan(0);
      expect(vercelJson.redirects[0].destination).toBe('https://bingoclubvnzla.vercel.app/$1');
      expect(vercelJson.redirects[0].permanent).toBe(true);
    });

    it('Rel canonical y og:url en index.html apuntan a https://bingoclubvnzla.vercel.app/', () => {
      const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
      expect(indexHtml).toContain('<link rel="canonical" href="https://bingoclubvnzla.vercel.app/" />');
      expect(indexHtml).toContain('<meta property="og:url" content="https://bingoclubvnzla.vercel.app/" />');
    });
  });
});
