import fs from 'fs';
import path from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.argv[2];
if (!GITHUB_TOKEN) {
  console.error('❌ Proporciona un token de GitHub vía GITHUB_TOKEN o como argumento: node scripts/github-api-sync.mjs <TOKEN>');
  process.exit(1);
}
const OWNER = 'bingoclubvnzla';
const REPO = 'BINGOCLUBVNZLA';
const BRANCH = 'main';

async function githubRequest(endpoint, method = 'GET', body = null) {
  const headers = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'BingoClubVNZLA-Deployer',
  };
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`GitHub API Error [${res.status}] ${endpoint}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function uploadFileBlob(filePath) {
  const contentBuffer = fs.readFileSync(filePath);
  const base64Content = contentBuffer.toString('base64');

  const blob = await githubRequest('/git/blobs', 'POST', {
    content: base64Content,
    encoding: 'base64',
  });
  return blob.sha;
}

async function syncAndDeploy() {
  console.log('🚀 Iniciando despliegue hacia GitHub mediante Git Data API...');

  // 1. Obtener última referencia de main
  const refData = await githubRequest(`/git/ref/heads/${BRANCH}`);
  const parentCommitSha = refData.object.sha;
  console.log(`📌 Commit actual en remoto (${BRANCH}): ${parentCommitSha}`);

  // 2. Obtener el tree base del commit actual
  const parentCommit = await githubRequest(`/git/commits/${parentCommitSha}`);
  const baseTreeSha = parentCommit.tree.sha;

  // 3. Archivos modificados y nuevos a desplegar
  const filesToDeploy = [
    'src/components/BingoClubLiveVisualizer.tsx',
    'src/components/LivePlayRoom.tsx',
    'src/components/FloatingBallsBackground.tsx',
    'src/components/LandingHero.tsx',
    'src/components/Navbar.tsx',
    'public/bingoclub.png',
    'public/fondo.mp4',
    'package.json',
    'scripts/github-api-sync.mjs',
  ];

  const treeEntries = [];

  for (const relativePath of filesToDeploy) {
    const fullPath = path.resolve(process.cwd(), relativePath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Archivo omitido (no existe): ${relativePath}`);
      continue;
    }

    const stat = fs.statSync(fullPath);
    console.log(`📦 Creando blob para ${relativePath} (${(stat.size / 1024).toFixed(1)} KB)...`);
    const blobSha = await uploadFileBlob(fullPath);
    treeEntries.push({
      path: relativePath,
      mode: '100644',
      type: 'blob',
      sha: blobSha,
    });
  }

  // 4. Crear nuevo tree
  console.log('🌲 Creando árbol git...');
  const newTree = await githubRequest('/git/trees', 'POST', {
    base_tree: baseTreeSha,
    tree: treeEntries,
  });

  // 5. Crear nuevo commit
  const commitMessage = 'feat(ui): Integrar visualizador oficial con video de fondo, logo transparente central y soporte broadcast';
  console.log('📝 Creando commit firmado...');
  const newCommit = await githubRequest('/git/commits', 'POST', {
    message: commitMessage,
    tree: newTree.sha,
    parents: [parentCommitSha],
  });
  console.log(`✨ Nuevo commit generado: ${newCommit.sha}`);

  // 6. Actualizar la rama main para disparar el webhook de despliegue en Vercel
  console.log('⚡ Actualizando refs/heads/main en GitHub...');
  await githubRequest(`/git/refs/heads/${BRANCH}`, 'PATCH', {
    sha: newCommit.sha,
    force: false,
  });

  console.log('✅ Despliegue completado con éxito hacia GitHub!');
  console.log(`🔗 Ver commit: https://github.com/${OWNER}/${REPO}/commit/${newCommit.sha}`);
}

syncAndDeploy().catch((err) => {
  console.error('❌ Error en despliegue:', err.message);
  process.exit(1);
});
