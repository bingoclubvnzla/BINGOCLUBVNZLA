// ==============================================================================
// BINGO CLUB VNZLA ONLINE — PRUEBAS DE CERTIFICACIÓN FASE 2.6.2
// Auditoría Integral de Seguridad PostgreSQL, PostgREST RPC, RLS y SECURITY DEFINER
// ==============================================================================

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Fase 2.6.2 — Certificación Final Pre-Deploy de Seguridad Supabase', () => {
  const rootDir = process.cwd();
  const migration07Path = path.join(rootDir, 'supabase/migrations/20261005000007_remediate_rls_auto_enable.sql');
  const migration08Path = path.join(rootDir, 'supabase/migrations/20261005000008_security_definer_hardening.sql');
  const fullSchemaPath = path.join(rootDir, 'supabase/FULL_SCHEMA_DEPLOY.sql');
  const fullSchemaContent = fs.readFileSync(fullSchemaPath, 'utf-8');

  // ----------------------------------------------------------------------------
  // 1-4. AUDITORÍA FORENSE DE rls_auto_enable()
  // ----------------------------------------------------------------------------
  it('1. rls_auto_enable() NO debe existir como función creada en el esquema final', () => {
    // No debe existir ninguna sentencia CREATE FUNCTION para rls_auto_enable
    const createMatch = fullSchemaContent.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.rls_auto_enable/i);
    expect(createMatch).toBeNull();
  });

  it('2-4. rls_auto_enable() debe tener revocación total de EXECUTE para PUBLIC, anon y authenticated', () => {
    // Debe existir la revocación explícita y DROP FUNCTION CASCADE
    expect(fullSchemaContent).toContain("REVOKE ALL ON FUNCTION ' || r.func_sig || ' FROM PUBLIC, anon, authenticated");
    expect(fullSchemaContent).toContain("DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE");

    const m7Content = fs.readFileSync(migration07Path, 'utf-8');
    expect(m7Content).toContain("REVOKE ALL ON FUNCTION ' || r.func_sig || ' FROM PUBLIC, anon, authenticated");
    expect(m7Content).toContain("DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE");
  });

  it('5. Funciones internas críticas deben estar estrictamente restringidas sin EXECUTE para PUBLIC o anon', () => {
    // 5.1 generate_public_id
    expect(fullSchemaContent).toContain('REVOKE EXECUTE ON FUNCTION public.generate_public_id() FROM PUBLIC, anon, authenticated;');
    // 5.2 handle_new_user
    expect(fullSchemaContent).toContain('REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;');
    // 5.3 protect_profile_mutations
    expect(fullSchemaContent).toContain('REVOKE EXECUTE ON FUNCTION public.protect_profile_mutations() FROM PUBLIC, anon, authenticated;');
    // 5.4 validate_draw_state_transition
    expect(fullSchemaContent).toContain('REVOKE EXECUTE ON FUNCTION public.validate_draw_state_transition(draw_status, draw_status) FROM PUBLIC, anon, authenticated;');
    // 5.5 generate_draw_permutation
    expect(fullSchemaContent).toContain('REVOKE EXECUTE ON FUNCTION public.generate_draw_permutation(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;');
    // 5.6 transition_draw_state_atomic
    expect(fullSchemaContent).toContain('REVOKE EXECUTE ON FUNCTION public.transition_draw_state_atomic(UUID, INTEGER, draw_status) FROM PUBLIC, anon, authenticated;');
    // 5.7 enforce_audit_log_immutability & enforce_card_lock & validate_chapitas_catalog_integrity
    expect(fullSchemaContent).toContain('REVOKE EXECUTE ON FUNCTION public.enforce_audit_log_immutability() FROM PUBLIC, anon, authenticated;');
    expect(fullSchemaContent).toContain('REVOKE EXECUTE ON FUNCTION public.enforce_card_lock() FROM PUBLIC, anon, authenticated;');
    expect(fullSchemaContent).toContain('REVOKE EXECUTE ON FUNCTION public.validate_chapitas_catalog_integrity() FROM PUBLIC, anon, authenticated;');
    // 5.8 Funciones de consulta de rol no accesibles para anon
    expect(fullSchemaContent).toContain('REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM anon;');
    expect(fullSchemaContent).toContain('REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;');
    expect(fullSchemaContent).toContain('REVOKE EXECUTE ON FUNCTION public.is_operator_or_higher() FROM anon;');
  });

  it('6. get_draw_snapshot() debe contar con control de acceso estricto anti-enumeración de sorteos DRAFT', () => {
    expect(fullSchemaContent).toContain("IF v_draw.status = 'DRAFT' AND NOT public.is_operator_or_higher() THEN");
    expect(fullSchemaContent).toContain("RETURN jsonb_build_object('error', 'Acceso denegado: Sorteo no disponible');");
  });

  it('7. log_auth_event() debe mitigar falsificación de eventos privilegiados y desbordamiento', () => {
    // Validación de lista blanca
    expect(fullSchemaContent).toContain("IF p_action NOT IN ('LOGIN_FAILURE', 'LOGIN_ATTEMPT', 'PASSWORD_RESET_REQUESTED', 'LOGOUT') THEN");
    // Límite de 2KB
    expect(fullSchemaContent).toContain("IF octet_length(COALESCE(p_metadata, '{}'::jsonb)::text) > 2048 THEN");
    // Redacción de secretos
    expect(fullSchemaContent).toContain("- 'password'");
    expect(fullSchemaContent).toContain("- 'token'");
    expect(fullSchemaContent).toContain("- 'turnstile_token'");
  });

  it('8-10. create, start y emit de sorteos deben exigir internamente rol OPERATOR o ADMIN', () => {
    // create_draw_authoritative
    expect(fullSchemaContent).toContain('IF NOT public.is_operator_or_higher() THEN');
    expect(fullSchemaContent).toContain("GRANT EXECUTE ON FUNCTION public.create_draw_authoritative(UUID, VARCHAR, TEXT) TO authenticated;");
    // start_draw_authoritative
    expect(fullSchemaContent).toContain("GRANT EXECUTE ON FUNCTION public.start_draw_authoritative(UUID, INTEGER) TO authenticated;");
    // emit_next_ball_authoritative
    expect(fullSchemaContent).toContain("GRANT EXECUTE ON FUNCTION public.emit_next_ball_authoritative(UUID, INTEGER) TO authenticated;");
  });

  it('11. draw_events no puede ser insertado directamente por PLAYER ni OPERATOR desde el cliente', () => {
    // Debe existir exclusivamente política de lectura pública
    expect(fullSchemaContent).toContain('CREATE POLICY "draw_events_select" ON public.draw_events');
    const insertPolicy = fullSchemaContent.match(/CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.draw_events\s+FOR\s+INSERT/i);
    expect(insertPolicy).toBeNull();
  });

  it('12. Sorteos activos no pueden ser modificados directamente por PLAYER ni OPERATOR vía cliente', () => {
    // Solo UPDATE en DRAFT permitido para administradores
    expect(fullSchemaContent).toContain('USING (public.is_admin() AND status = \'DRAFT\')');
    expect(fullSchemaContent).toContain('WITH CHECK (public.is_admin() AND status = \'DRAFT\')');
  });

  it('13. cards no pueden ser fabricadas por PLAYER (solo lectura propia y emisión por admin)', () => {
    expect(fullSchemaContent).toContain('CREATE POLICY "cards_select_own" ON public.cards');
    expect(fullSchemaContent).toContain('CREATE POLICY "cards_insert_admin" ON public.cards');
    // Ninguna política de inserción para PLAYER
    const playerCardInsert = fullSchemaContent.match(/CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.cards\s+FOR\s+INSERT\s+TO\s+authenticated\s+WITH\s+CHECK\s*\([^)]*auth\.uid\(\)\s*=\s*user_id/i);
    expect(playerCardInsert).toBeNull();
  });

  it('14. wallets no pueden ser manipuladas directamente por ningún cliente (0 mutaciones)', () => {
    // Solo SELECT permitido
    expect(fullSchemaContent).toContain('CREATE POLICY "wallets_select_own" ON public.wallets');
    const walletMutate = fullSchemaContent.match(/CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.wallets\s+FOR\s+(INSERT|UPDATE|DELETE|ALL)/i);
    expect(walletMutate).toBeNull();
  });

  it('15. payment_requests mantienen control estricto de estado PENDING y revisión de operador', () => {
    expect(fullSchemaContent).toContain('CREATE POLICY "payment_requests_insert_own" ON public.payment_requests');
    expect(fullSchemaContent).toContain('WITH CHECK (user_id = auth.uid())');
    expect(fullSchemaContent).toContain('CREATE POLICY "payment_requests_update_operator" ON public.payment_requests');
  });

  it('16. winners no puede ser falsificado desde cliente (solo lectura pública)', () => {
    expect(fullSchemaContent).toContain('CREATE POLICY "winners_select_all" ON public.winners');
    const winnerMutate = fullSchemaContent.match(/CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.winners\s+FOR\s+(INSERT|UPDATE|DELETE|ALL)/i);
    expect(winnerMutate).toBeNull();
  });

  // ----------------------------------------------------------------------------
  // INVENTARIO EXACTO DE FUNCIONES Y CRIPTOGRAFÍA
  // ----------------------------------------------------------------------------
  it('17. Criptografía e Identificadores: 0 uso de random() o MD5 en el esquema consolidado', () => {
    const md5Match = fullSchemaContent.match(/\bmd5\s*\(/i);
    const randomMatch = fullSchemaContent.match(/\brandom\s*\(\)/i);
    expect(md5Match).toBeNull();
    expect(randomMatch).toBeNull();
    expect(fullSchemaContent).toContain('gen_random_bytes(3)');
    expect(fullSchemaContent).toContain("digest(");
  });

  it('18. Inventario Matemático Exacto: 17 funciones (16 SECURITY DEFINER con search_path + 1 SECURITY INVOKER IMMUTABLE)', () => {
    const lines = fullSchemaContent.split('\n');
    const foundFunctions: { name: string; isSecDef: boolean; hasSearchPath: boolean }[] = [];
    let currentFunc: { name: string; lines: string[] } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([a-zA-Z0-9_.]+)\s*\(/i);
      if (m) {
        if (currentFunc) {
          const body = currentFunc.lines.join('\n');
          foundFunctions.push({
            name: currentFunc.name,
            isSecDef: /SECURITY\s+DEFINER/i.test(body),
            hasSearchPath: /SET\s+search_path\s*=\s*public,\s*pg_temp/i.test(body)
          });
        }
        currentFunc = { name: m[1], lines: [line] };
      } else if (currentFunc) {
        currentFunc.lines.push(line);
        if (line.includes('$$') && (line.includes('LANGUAGE') || currentFunc.lines.some(l => l.includes('LANGUAGE')))) {
          if (line.trim().endsWith(';')) {
            const body = currentFunc.lines.join('\n');
            foundFunctions.push({
              name: currentFunc.name,
              isSecDef: /SECURITY\s+DEFINER/i.test(body),
              hasSearchPath: /SET\s+search_path\s*=\s*public,\s*pg_temp/i.test(body)
            });
            currentFunc = null;
          }
        }
      }
    }
    if (currentFunc) {
      const body = currentFunc.lines.join('\n');
      foundFunctions.push({
        name: currentFunc.name,
        isSecDef: /SECURITY\s+DEFINER/i.test(body),
        hasSearchPath: /SET\s+search_path\s*=\s*public,\s*pg_temp/i.test(body)
      });
    }

    // Exactamente 17 funciones declaradas en el SQL consolidado
    expect(foundFunctions.length).toBe(17);

    const secDefFunctions = foundFunctions.filter(f => f.isSecDef);
    const secInvFunctions = foundFunctions.filter(f => !f.isSecDef);

    // Exactamente 16 SECURITY DEFINER y 1 SECURITY INVOKER
    expect(secDefFunctions.length).toBe(16);
    expect(secInvFunctions.length).toBe(1);
    expect(secInvFunctions[0].name).toBe('public.validate_draw_state_transition');

    // La totalidad de las 16 funciones SECURITY DEFINER deben contar con SET search_path = public, pg_temp
    for (const f of secDefFunctions) {
      expect(f.hasSearchPath).toBe(true);
    }
  });

  it('19. Las 16 tablas del sistema deben poseer ENABLE ROW LEVEL SECURITY explícito', () => {
    const requiredTables = [
      'profiles',
      'audit_logs',
      'app_settings',
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
      'winners'
    ];

    for (const table of requiredTables) {
      const rlsRegex = new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');
      expect(fullSchemaContent).toMatch(rlsRegex);
    }
  });

  it('20. La vista v_chapitas_catalog debe existir y contener los 90 elementos canónicos (45 animales + 45 objetos)', () => {
    expect(fullSchemaContent).toContain('CREATE OR REPLACE VIEW public.v_chapitas_catalog AS');
    expect(fullSchemaContent).toContain("WHERE mc.modality_id = 'ANIMALITOS' AND mc.number_value BETWEEN 1 AND 45");
    expect(fullSchemaContent).toContain("WHERE mc.modality_id = 'OBJETOS' AND mc.number_value BETWEEN 1 AND 45");
  });
});
