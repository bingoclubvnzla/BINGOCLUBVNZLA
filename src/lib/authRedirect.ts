// ==============================================================================
// BINGO CLUB VNZLA ONLINE — GESTOR SEGURO DE REDIRECCIONES (FASE 2.4)
// Prevención estricta de Open Redirects, esquemas no permitidos (javascript:, data:)
// y validación de orígenes autorizados para Google OAuth y Email Confirmation.
// ==============================================================================

import {
  CANONICAL_PRODUCTION_URL,
  CANONICAL_PRODUCTION_HOST,
  getCanonicalAppUrl,
  getCanonicalAuthRedirectUrl,
  isForbiddenVercelDeploymentHost,
} from './canonicalConfig';

/**
 * Lista de dominios/orígenes base autorizados para redirecciones en los distintos
 * entornos de Bingo Club VNZLA (Producción, Preview y Desarrollo local).
 */
const DEFAULT_ALLOWED_ORIGINS: string[] = [
  CANONICAL_PRODUCTION_URL,
  'https://bingoclub.com.ve',
  'https://www.bingoclub.com.ve',
];

/**
 * Valida si una URL es segura para redirección.
 * Rechaza:
 * - javascript:, data:, vbscript:, file:
 * - URLs relativas con doble barra (//attacker.com)
 * - Caracteres de control CRLF
 * - Dominios externos no autorizados
 */
export function isAllowedRedirectUrl(targetUrl: string, allowedOrigins: string[] = []): boolean {
  if (!targetUrl || typeof targetUrl !== 'string') return false;

  const trimmed = targetUrl.trim();

  // 1. Prohibir inyecciones de caracteres de control, CRLF o null bytes antes de decodificar
  if (/[\r\n\t\0]/.test(trimmed)) {
    return false;
  }

  // 2. Decodificación defensiva para detectar ataques ofuscados (%2F%2F, %0A, %0D, javascript%3A)
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // mantener primera pasada si no hay doble codificación
    }
  } catch {
    // Si contiene secuencias percent-encoding inválidas o truncadas, rechazar por seguridad
    return false;
  }

  const decodedLower = decoded.toLowerCase().trim();
  const trimmedLower = trimmed.toLowerCase();

  // 3. Prohibir CRLF o null bytes en versión decodificada
  if (/[\r\n\t\0]/.test(decodedLower)) {
    return false;
  }

  // 4. Prohibir esquemas de scripting y datos (tanto codificados como en texto claro)
  const forbiddenSchemes = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:', 'blob:'];
  for (const scheme of forbiddenSchemes) {
    if (trimmedLower.startsWith(scheme) || decodedLower.startsWith(scheme)) {
      return false;
    }
  }

  // 5. Prohibir evasión protocol-relative y secuencias maliciosas de barras (//, \\, /\, \/)
  if (
    trimmed.startsWith('//') ||
    decoded.startsWith('//') ||
    trimmed.startsWith('\\\\') ||
    decoded.startsWith('\\\\') ||
    trimmed.startsWith('/\\') ||
    decoded.startsWith('/\\') ||
    trimmed.startsWith('\\/') ||
    decoded.startsWith('\\/')
  ) {
    return false;
  }

  // 6. Si es una ruta relativa local segura (empieza con / pero no con doble barra o contra-barra)
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.startsWith('/\\') &&
    !decoded.startsWith('//') &&
    !decoded.startsWith('/\\')
  ) {
    return true;
  }

  // 7. Si es una URL absoluta, parsear y validar origen
  try {
    const parsed = new URL(trimmed);

    // Solo se permite protocolo HTTP / HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    // 8. Rechazar terminantemente cualquier alias de deployment de Vercel no canónico
    if (isForbiddenVercelDeploymentHost(parsed.hostname)) {
      return false;
    }

    // Combinar orígenes autorizados con el origen actual de la ventana si estamos en navegador
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const whitelist = [
      currentOrigin,
      ...DEFAULT_ALLOWED_ORIGINS,
      ...allowedOrigins,
    ].filter(Boolean);

    // Permitir orígenes de desarrollo local seguros (localhost, 127.0.0.1)
    const isLocalhost =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname.endsWith('.localhost');

    // Permitir subdominios de vista previa autorizados de AI Studio / Cloud Run y Vercel
    const isAiStudioPreview =
      parsed.hostname.endsWith('.run.app') || parsed.hostname.endsWith('.vercel.app');

    // Es el dominio de producción canónico oficial
    const isCanonicalProduction = parsed.hostname.toLowerCase() === CANONICAL_PRODUCTION_HOST;

    const isExplicitlyWhitelisted = whitelist.some((origin) => {
      try {
        const originUrl = new URL(origin);
        return originUrl.origin.toLowerCase() === parsed.origin.toLowerCase();
      } catch {
        return false;
      }
    });

    return isCanonicalProduction || isExplicitlyWhitelisted || isLocalhost || isAiStudioPreview;
  } catch {
    return false;
  }
}

/**
 * Obtiene la URL de redirección canónica y sanitizada para Supabase Auth OAuth o Email.
 * En producción y en cualquier host de Vercel, SIEMPRE delega a la autoridad canónica:
 * https://bingoclubvnzla.vercel.app
 * Protegido contra la captura por previews o deployment aliases automáticos.
 */
export function getSafeRedirectUrl(customPath = '/'): string {
  if (
    !customPath ||
    typeof customPath !== 'string' ||
    customPath === '/' ||
    customPath.toLowerCase().includes('javascript') ||
    customPath.toLowerCase().includes('data:') ||
    customPath.toLowerCase().includes('vbscript:') ||
    !customPath.startsWith('/') ||
    !isAllowedRedirectUrl(customPath)
  ) {
    return getCanonicalAuthRedirectUrl('/');
  }
  return getCanonicalAuthRedirectUrl(customPath);
}

