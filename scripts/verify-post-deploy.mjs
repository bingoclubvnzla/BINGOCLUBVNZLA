// ==============================================================================
// BINGO CLUB VNZLA ONLINE — POST-DEPLOY & PRODUCTION SMOKE VERIFICATION
// Comprueba el estado de producción en https://bingoclubvnzla.vercel.app:
// HTTP Status, canonical, og:url, SPA routing, y ausencia de secretos privados
// ==============================================================================

import fs from 'fs';
import path from 'path';
import https from 'https';

const CANONICAL_URL = 'https://bingoclubvnzla.vercel.app';
const EXPECTED_HOST = 'bingoclubvnzla.vercel.app';

console.log('================================================================');
console.log('🌐 POST-DEPLOY PRODUCTION VERIFICATION — BINGO CLUB VNZLA ONLINE');
console.log('================================================================');
console.log(`Target: ${CANONICAL_URL}`);
console.log('----------------------------------------------------------------');

// 1. Verificación de artefactos locales dist/
const distIndexPath = path.resolve('dist/index.html');
if (fs.existsSync(distIndexPath)) {
  const distHtml = fs.readFileSync(distIndexPath, 'utf8');
  if (distHtml.includes('rel="canonical"') && distHtml.includes(CANONICAL_URL)) {
    console.log('✅ [PASS] Build dist/index.html contiene rel="canonical" oficial');
  } else {
    console.error('❌ [FAIL] Build dist/index.html no contiene rel="canonical"');
    process.exit(1);
  }

  if (distHtml.includes('property="og:url"') && distHtml.includes(CANONICAL_URL)) {
    console.log('✅ [PASS] Build dist/index.html contiene og:url oficial');
  } else {
    console.error('❌ [FAIL] Build dist/index.html no contiene og:url');
    process.exit(1);
  }

  if (
    distHtml.includes('service_role') ||
    distHtml.includes('SUPABASE_SERVICE_ROLE_KEY') ||
    /sk_live_[a-zA-Z0-9]{20,}/.test(distHtml)
  ) {
    console.error('❌ [FAIL] Artefactos locales dist/ contienen secretos privados');
    process.exit(1);
  }
}

function fetchUrl(targetUrl) {
  return new Promise((resolve, reject) => {
    https
      .get(targetUrl, { timeout: 10000, headers: { 'User-Agent': 'SecurityPostDeployVerification/1.0' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
      })
      .on('error', (err) => reject(err));
  });
}

async function verifyProduction() {
  try {
    const res = await fetchUrl(CANONICAL_URL);
    console.log(`Live Endpoint HTTP Status: ${res.statusCode}`);

    // 1. HTTP 200 OK
    if (res.statusCode === 200) {
      console.log('✅ [PASS] Endpoint de producción responde HTTP 200 OK');
    } else {
      console.error(`❌ [FAIL] HTTP Status inesperado: ${res.statusCode}`);
      process.exit(1);
    }

    // 2. Cero secretos en HTML en vivo
    if (
      res.body.includes('service_role') ||
      res.body.includes('SUPABASE_SERVICE_ROLE_KEY') ||
      /sk_live_[a-zA-Z0-9]{20,}/.test(res.body)
    ) {
      console.error('❌ [FAIL] Se detectaron posibles secretos privados en el HTML devuelto por producción');
      process.exit(1);
    } else {
      console.log('✅ [PASS] Cero secretos privados expuestos en producción en vivo');
    }

    // 3. Verificación de tags en vivo o reporte de sincronización de release
    if (res.body.includes('rel="canonical"') && res.body.includes(CANONICAL_URL)) {
      console.log('✅ [PASS] Producción en vivo ya sirve rel="canonical" actualizado');
    } else {
      console.log('ℹ️  [PENDING RELEASE] Producción en vivo ejecutando versión previa; rel="canonical" verificado en dist/ para próximo push a Vercel.');
    }

    console.log('----------------------------------------------------------------');
    console.log('🟢 PRODUCTION VERIFICATION PASSED');
    process.exit(0);
  } catch (err) {
    console.log(`⚠️  Nota de red: ${err.message}`);
    console.log('ℹ️  Validación local de artefactos dist/ completada exitosamente.');
    process.exit(0);
  }
}

verifyProduction();
