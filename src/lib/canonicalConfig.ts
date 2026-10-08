// ==============================================================================
// BINGO CLUB VNZLA ONLINE — CONFIGURACIÓN CANÓNICA DE DOMINIO Y REDIRECCIONES
// DOMINIO CANÓNICO Y OFICIAL: https://bingoclubvnzla.vercel.app/
// ==============================================================================

/**
 * Dominio de producción canónico oficial, único e inmutable.
 * Ningún deployment automático de Vercel ni vista previa debe reemplazar este valor.
 */
export const CANONICAL_PRODUCTION_URL = 'https://bingoclubvnzla.vercel.app';
export const CANONICAL_PRODUCTION_HOST = 'bingoclubvnzla.vercel.app';

/**
 * Dominio canónico con barra final garantizada para rutas raíz.
 */
export const CANONICAL_PRODUCTION_ORIGIN_WITH_SLASH = 'https://bingoclubvnzla.vercel.app/';

/**
 * Callback de autenticación canónico oficial para Supabase Auth / Google OAuth.
 */
export const CANONICAL_OAUTH_CALLBACK_URL = 'https://bingoclubvnzla.vercel.app/auth/callback';

/**
 * Patrones de host de Vercel prohibidos como destino público u OAuth.
 * Incluye aliases automáticos generados por ramas, commits o cuentas (ej. bingoclubvnzla-bingoclubvnzla.vercel.app).
 */
export const FORBIDDEN_VERCEL_DEPLOYMENT_PATTERNS: RegExp[] = [
  /^bingoclubvnzla-.*\.vercel\.app$/i,
  /^bingoclubvnzla-bingoclubvnzla\.vercel\.app$/i,
  /^bingoclubvnzla-.*-bingoclubvnzla\.vercel\.app$/i,
  /^bingoclubvnzla-git-.*\.vercel\.app$/i,
  /^bingoclubvnzla-[a-z0-9]+-bingoclubvnzla\.vercel\.app$/i,
];

/**
 * Determina si un hostname o URL corresponde a un alias de deployment automático o no canónico de Vercel.
 */
export function isForbiddenVercelDeploymentHost(hostnameOrUrl: string): boolean {
  if (!hostnameOrUrl || typeof hostnameOrUrl !== 'string') return false;

  let cleanHost = hostnameOrUrl.trim().toLowerCase();

  // Si viene con esquema, extraer hostname
  if (cleanHost.includes('://')) {
    try {
      cleanHost = new URL(cleanHost).hostname.toLowerCase();
    } catch {
      return false;
    }
  }

  // Remover puerto si viniera
  cleanHost = cleanHost.split(':')[0];

  // Si es el dominio canónico oficial, es permitido
  if (cleanHost === CANONICAL_PRODUCTION_HOST) {
    return false;
  }

  // Si coincide con patrones de aliases automáticos de Vercel para el proyecto
  if (FORBIDDEN_VERCEL_DEPLOYMENT_PATTERNS.some((pattern) => pattern.test(cleanHost))) {
    return true;
  }

  return false;
}


/**
 * Retorna la URL canónica oficial para un path dado.
 * Garantiza que siempre devuelva https://bingoclubvnzla.vercel.app${cleanPath}.
 */
export function getCanonicalAppUrl(path = '/'): string {
  if (!path || path === '/') {
    return CANONICAL_PRODUCTION_ORIGIN_WITH_SLASH;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${CANONICAL_PRODUCTION_URL}${cleanPath}`;
}

/**
 * Determina la URL autoritativa y sanitizada para redirecciones de autenticación (OAuth / Email).
 * Regla de Oro: En producción o en cualquier host de Vercel, SIEMPRE utiliza el dominio canónico.
 * NUNCA confía en window.location.origin si este apunta a un deployment alias de Vercel.
 */
export function getCanonicalAuthRedirectUrl(customPath = '/'): string {
  const cleanPath = !customPath || customPath === '/' ? '/' : (customPath.startsWith('/') ? customPath : `/${customPath}`);

  if (typeof window !== 'undefined' && window.location) {
    const currentHost = window.location.hostname.toLowerCase();

    // 1. Si estamos en un host de Vercel (canónico o preview/deployment alias):
    // FORZAR SIEMPRE el dominio canónico oficial
    if (currentHost.endsWith('.vercel.app')) {
      return getCanonicalAppUrl(cleanPath);
    }

    // 2. Si estamos en entorno de desarrollo local (localhost o 127.0.0.1):
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      return `${window.location.origin}${cleanPath}`;
    }

    // 3. Si estamos en Google Cloud Run / AI Studio preview (sandbox de desarrollo):
    if (currentHost.endsWith('.run.app')) {
      return `${window.location.origin}${cleanPath}`;
    }
  }

  // Por defecto (SSR, producción, o cualquier otro contexto): siempre el dominio canónico
  return getCanonicalAppUrl(cleanPath);
}

/**
 * Redirección forzosa en cliente:
 * Si el usuario accede por error a un deployment alias (ej. bingoclubvnzla-bingoclubvnzla.vercel.app),
 * reemplaza la ubicación inmediatamente hacia el dominio canónico oficial.
 */
export function enforceCanonicalDomainClientSide(): boolean {
  if (typeof window === 'undefined' || !window.location) return false;

  const currentHost = window.location.hostname.toLowerCase();

  if (isForbiddenVercelDeploymentHost(currentHost)) {
    const cleanPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const targetUrl = `${CANONICAL_PRODUCTION_URL}${cleanPath}`;
    console.warn(`[DOMINIO NO CANÓNICO DETECTADO]: Redirigiendo desde ${currentHost} hacia ${CANONICAL_PRODUCTION_URL}`);
    window.location.replace(targetUrl);
    return true;
  }

  return false;
}
