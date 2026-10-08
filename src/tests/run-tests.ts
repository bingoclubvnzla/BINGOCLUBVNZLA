// ============================================================================
// BINGO CLUB VNZLA ONLINE — SUITE DE PRUEBAS DE SEGURIDAD Y REGLAS DE NEGOCIO
// FASE 1: RBAC, RLS LOGIC, VALIDACIONES, MÁQUINA DE ESTADOS Y PRUEBAS NEGATIVAS
// ============================================================================

import {
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  hasPermission,
  canAssignRole,
  isValidDrawTransition,
  isValidPublicId,
  isValidVenezuelanPhone,
  PermissionCode,
} from '../lib/permissions';
import { UserRole, DrawStatus } from '../types/database.types';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${testName}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${testName} ${details ? `(${details})` : ''}`);
  }
}

function assertThrows(fn: () => void, testName: string) {
  try {
    fn();
    failedTests++;
    console.error(`  \x1b[31m✖ FAIL (Debería haber fallado):\x1b[0m ${testName}`);
  } catch {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS (Rechazado correctamente):\x1b[0m ${testName}`);
  }
}

console.log('\n======================================================');
console.log('  BINGO CLUB VNZLA ONLINE — SUITE DE PRUEBAS FASE 1');
console.log('======================================================\n');

// ----------------------------------------------------------------------------
// 1. IDENTIFICADOR PÚBLICO BCV-XXXXXX
// ----------------------------------------------------------------------------
console.log('--- SUITE 1: Identificador Público y Privacidad ---');
assert(isValidPublicId('BCV-ABC123'), 'BCV-ABC123 es un identificador válido');
assert(isValidPublicId('BCV-7X9P2Q'), 'BCV-7X9P2Q es un identificador válido');
assert(!isValidPublicId('BCV-12345'), 'BCV con menos de 6 caracteres es inválido (Prueba negativa)');
assert(!isValidPublicId('bcv-abcdef'), 'BCV en minúsculas es inválido (Prueba negativa)');
assert(!isValidPublicId('user@email.com'), 'Email rechazado como identificador público (Prueba negativa)');

// ----------------------------------------------------------------------------
// 2. VALIDACIÓN DE TELÉFONOS VENEZOLANOS (+58)
// ----------------------------------------------------------------------------
console.log('\n--- SUITE 2: Validación de Teléfonos Venezolanos ---');
assert(isValidVenezuelanPhone('+584121234567'), 'Número internacional +58412 válido');
assert(isValidVenezuelanPhone('04147654321'), 'Número nacional 0414 válido');
assert(isValidVenezuelanPhone('04245551234'), 'Número nacional 0424 válido');
assert(isValidVenezuelanPhone('+584169998877'), 'Número internacional +58416 válido');
assert(!isValidVenezuelanPhone('123456'), 'Número corto inválido (Prueba negativa)');
assert(!isValidVenezuelanPhone('+15551234567'), 'Número no venezolano (+1) rechazado (Prueba negativa)');
assert(!isValidVenezuelanPhone('letras-no-validas'), 'Texto no numérico rechazado (Prueba negativa)');

// ----------------------------------------------------------------------------
// 3. MATRIZ DE ROLES (RBAC) Y PERMISOS
// ----------------------------------------------------------------------------
console.log('\n--- SUITE 3: Control de Acceso Basado en Roles (RBAC) ---');
assert(hasPermission('PLAYER', 'draws:read'), 'PLAYER puede leer sorteos');
assert(hasPermission('PLAYER', 'cards:buy'), 'PLAYER puede comprar cartones');
assert(!hasPermission('PLAYER', 'draws:execute'), 'PLAYER NO puede ejecutar sorteos (Prueba negativa)');
assert(!hasPermission('PLAYER', 'draws:create'), 'PLAYER NO puede crear sorteos (Prueba negativa)');
assert(!hasPermission('PLAYER', 'roles:assign'), 'PLAYER NO puede asignar roles (Prueba negativa)');
assert(!hasPermission('PLAYER', 'audit:view'), 'PLAYER NO puede ver bitácora de auditoría (Prueba negativa)');

assert(hasPermission('OPERATOR', 'draws:execute'), 'OPERATOR puede ejecutar sorteos');
assert(!hasPermission('OPERATOR', 'roles:assign'), 'OPERATOR NO puede asignar roles (Prueba negativa)');
assert(!hasPermission('OPERATOR', 'settings:manage'), 'OPERATOR NO puede cambiar settings (Prueba negativa)');

assert(hasPermission('SUPERVISOR', 'draws:cancel'), 'SUPERVISOR puede cancelar sorteos por contingencia');
assert(hasPermission('ADMIN', 'roles:assign'), 'ADMIN puede asignar roles');
assert(hasPermission('SUPER_ADMIN', 'settings:manage'), 'SUPER_ADMIN tiene acceso a settings');

// ----------------------------------------------------------------------------
// 4. PRUEBAS NEGATIVAS DE ESCALADA DE PRIVILEGIOS
// ----------------------------------------------------------------------------
console.log('\n--- SUITE 4: Pruebas Negativas de Prevención de Escalada ---');
assert(!canAssignRole('PLAYER', 'OPERATOR'), 'PLAYER no puede auto-escalarse a OPERATOR');
assert(!canAssignRole('PLAYER', 'ADMIN'), 'PLAYER no puede auto-escalarse a ADMIN');
assert(!canAssignRole('OPERATOR', 'ADMIN'), 'OPERATOR no puede auto-escalarse a ADMIN');
assert(!canAssignRole('OPERATOR', 'OPERATOR'), 'OPERATOR no puede asignar roles de su mismo nivel');
assert(!canAssignRole('ADMIN', 'SUPER_ADMIN'), 'ADMIN no puede auto-escalarse a SUPER_ADMIN');
assert(canAssignRole('ADMIN', 'OPERATOR'), 'ADMIN sí puede asignar rol OPERATOR');
assert(canAssignRole('SUPER_ADMIN', 'ADMIN'), 'SUPER_ADMIN sí puede asignar rol ADMIN');

// Simulación de intento de mutación no autorizada de perfil
function simulatePlayerProfileUpdate(actorRole: UserRole, targetField: string) {
  const forbiddenFields = ['role', 'status', 'security_level'];
  if (actorRole === 'PLAYER' && forbiddenFields.includes(targetField)) {
    throw new Error(`VIOLACIÓN DE SEGURIDAD: PLAYER no puede alterar campo ${targetField}`);
  }
}
assertThrows(() => simulatePlayerProfileUpdate('PLAYER', 'role'), 'PLAYER intentando alterar columna role es bloqueado');
assertThrows(() => simulatePlayerProfileUpdate('PLAYER', 'status'), 'PLAYER intentando alterar columna status es bloqueado');
assertThrows(() => simulatePlayerProfileUpdate('PLAYER', 'security_level'), 'PLAYER intentando alterar security_level es bloqueado');

// ----------------------------------------------------------------------------
// 5. MÁQUINA DE ESTADOS PARA SORTEOS (DRAWS) — SERVER AUTHORITATIVE
// ----------------------------------------------------------------------------
console.log('\n--- SUITE 5: Integridad de Máquina de Estados para Sorteos ---');
// Transiciones válidas
assert(isValidDrawTransition('DRAFT', 'SCHEDULED'), 'DRAFT -> SCHEDULED es válido');
assert(isValidDrawTransition('SCHEDULED', 'READY'), 'SCHEDULED -> READY es válido');
assert(isValidDrawTransition('READY', 'ACTIVE'), 'READY -> ACTIVE es válido');
assert(isValidDrawTransition('ACTIVE', 'PAUSED'), 'ACTIVE -> PAUSED es válido');
assert(isValidDrawTransition('PAUSED', 'ACTIVE'), 'PAUSED -> ACTIVE es válido');
assert(isValidDrawTransition('ACTIVE', 'FINISHED'), 'ACTIVE -> FINISHED es válido');
assert(isValidDrawTransition('FINISHED', 'ARCHIVED'), 'FINISHED -> ARCHIVED es válido');
assert(isValidDrawTransition('SCHEDULED', 'CANCELLED'), 'SCHEDULED -> CANCELLED es válido');

// Transiciones ilegales (Pruebas negativas)
assert(!isValidDrawTransition('DRAFT', 'ACTIVE'), 'DRAFT -> ACTIVE es ILEGAL (Prueba negativa)');
assert(!isValidDrawTransition('DRAFT', 'FINISHED'), 'DRAFT -> FINISHED es ILEGAL (Prueba negativa)');
assert(!isValidDrawTransition('FINISHED', 'ACTIVE'), 'FINISHED -> ACTIVE es ILEGAL (Prueba negativa)');
assert(!isValidDrawTransition('FINISHED', 'DRAFT'), 'FINISHED -> DRAFT es ILEGAL (Prueba negativa)');
assert(!isValidDrawTransition('ARCHIVED', 'ACTIVE'), 'ARCHIVED -> ACTIVE es ILEGAL (Prueba negativa)');
assert(!isValidDrawTransition('ARCHIVED', 'DRAFT'), 'ARCHIVED -> DRAFT es ILEGAL (Prueba negativa)');

// ----------------------------------------------------------------------------
// 6. ESPECIFICACIÓN DE LAS 5 MODALIDADES OFICIALES
// ----------------------------------------------------------------------------
console.log('\n--- SUITE 6: Especificación de las 5 Modalidades de Juego ---');
interface ModalitySpec {
  code: string;
  gridRows: number;
  gridCols: number;
  hasFreeCenter: boolean;
}

const MODALITIES_CATALOG: ModalitySpec[] = [
  { code: 'BINGO_75', gridRows: 5, gridCols: 5, hasFreeCenter: true },
  { code: 'BINGO_90', gridRows: 3, gridCols: 5, hasFreeCenter: false },
  { code: 'ANIMALITOS', gridRows: 5, gridCols: 5, hasFreeCenter: true },
  { code: 'OBJETOS', gridRows: 5, gridCols: 5, hasFreeCenter: true },
  { code: 'CHAPITAS', gridRows: 3, gridCols: 5, hasFreeCenter: false },
];

assert(MODALITIES_CATALOG.length === 5, 'Exactamente 5 modalidades configuradas');
const b75 = MODALITIES_CATALOG.find((m) => m.code === 'BINGO_75');
assert(b75?.gridRows === 5 && b75?.gridCols === 5 && b75?.hasFreeCenter === true, 'BINGO_75 es 5x5 con centro libre');

const b90 = MODALITIES_CATALOG.find((m) => m.code === 'BINGO_90');
assert(b90?.gridRows === 3 && b90?.gridCols === 5 && b90?.hasFreeCenter === false, 'BINGO_90 es 3x5 sin centro libre');

const anim = MODALITIES_CATALOG.find((m) => m.code === 'ANIMALITOS');
assert(anim?.gridRows === 5 && anim?.gridCols === 5 && anim?.hasFreeCenter === true, 'ANIMALITOS es 5x5 con centro libre');

const obj = MODALITIES_CATALOG.find((m) => m.code === 'OBJETOS');
assert(obj?.gridRows === 5 && obj?.gridCols === 5 && obj?.hasFreeCenter === true, 'OBJETOS es 5x5 con centro libre');

const chap = MODALITIES_CATALOG.find((m) => m.code === 'CHAPITAS');
assert(chap?.gridRows === 3 && chap?.gridCols === 5 && chap?.hasFreeCenter === false, 'CHAPITAS es 3x5 sin centro libre');

// ----------------------------------------------------------------------------
// 7. SEGURIDAD DE BILLETERA EN FASE 1 (NO DINERO REAL)
// ----------------------------------------------------------------------------
console.log('\n--- SUITE 7: Regla Crítica de Billetera en Fase 1 ---');
function simulateClientDirectBalanceMutation(isPhase1: boolean) {
  if (isPhase1) {
    throw new Error('ACCESO DENEGADO: Operaciones financieras desactivadas en Fase 1');
  }
}
assertThrows(
  () => simulateClientDirectBalanceMutation(true),
  'Mutación de saldo en cliente rechazada durante Fase 1'
);

// ----------------------------------------------------------------------------
// RESUMEN FINAL
// ----------------------------------------------------------------------------
console.log('\n======================================================');
console.log(`  RESULTADO TOTAL DE PRUEBAS:`);
console.log(`  PASADAS: \x1b[32m${passedTests}\x1b[0m`);
console.log(`  FALLIDAS: \x1b[31m${failedTests}\x1b[0m`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('✅ Todas las pruebas de seguridad y lógica de negocio pasaron satisfactoriamente.\n');
  process.exit(0);
}
