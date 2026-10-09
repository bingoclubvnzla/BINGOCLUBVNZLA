import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Auditoría Forense y Endurecimiento de Environment Variables', () => {
  const rootDir = process.cwd();

  it('1. .env.example debe contener únicamente nombres y valores placeholder seguros', () => {
    const envExamplePath = path.join(rootDir, '.env.example');
    expect(fs.existsSync(envExamplePath)).toBe(true);
    const content = fs.readFileSync(envExamplePath, 'utf-8');

    // Prohibir que contenga asignaciones de claves reales de servicio o secretos
    expect(content).not.toMatch(/^SUPABASE_SERVICE_ROLE_KEY\s*=/m);
    expect(content).not.toMatch(/^SERVICE_ROLE\s*=/m);
    expect(content).not.toMatch(/^GOOGLE_CLIENT_SECRET\s*=/m);
    expect(content).not.toMatch(/^TURNSTILE_SECRET\s*=/m);
  });

  it('2. .env.production no debe contener ningún secreto privado', () => {
    const envProdPath = path.join(rootDir, '.env.production');
    if (fs.existsSync(envProdPath)) {
      const content = fs.readFileSync(envProdPath, 'utf-8');
      expect(content).not.toMatch(/SERVICE_ROLE/i);
      expect(content).not.toMatch(/SECRET_KEY/i);
      expect(content).not.toMatch(/DATABASE_URL/i);
      expect(content).not.toMatch(/POSTGRES_URL/i);
      expect(content).not.toMatch(/GOOGLE_CLIENT_SECRET/i);
      expect(content).not.toMatch(/JWT_SECRET/i);
      expect(content).not.toMatch(/DB_PASSWORD/i);
    }
  });

  it('3. vite.config.ts define exclusivamente variables públicas para el cliente', () => {
    const viteConfigPath = path.join(rootDir, 'vite.config.ts');
    const content = fs.readFileSync(viteConfigPath, 'utf-8');

    // Verifica que solo define las 3 variables públicas permitidas
    expect(content).toContain('import.meta.env.VITE_SUPABASE_URL');
    expect(content).toContain('import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY');
    expect(content).toContain('import.meta.env.VITE_TURNSTILE_SITE_KEY');

    // No debe definir secretos
    expect(content).not.toContain('SERVICE_ROLE');
    expect(content).not.toContain('TURNSTILE_SECRET');
    expect(content).not.toContain('GOOGLE_CLIENT_SECRET');
  });

  it('4. Código fuente (src/) no debe tener referencias a variables privadas de servidor', () => {
    function scanDir(dir: string, forbiddenRegex: RegExp): string[] {
      let violations: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          violations = violations.concat(scanDir(fullPath, forbiddenRegex));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          // Ignorar audit.ts que contiene listas negras de sanitización
          if (entry.name === 'audit.ts') continue;

          if (forbiddenRegex.test(content)) {
            violations.push(`${fullPath}: coincidencia prohibida`);
          }
        }
      }
      return violations;
    }

    const srcDir = path.join(rootDir, 'src');
    const forbiddenPattern = /\b(SUPABASE_SERVICE_ROLE_KEY|TURNSTILE_SECRET_KEY|GOOGLE_CLIENT_SECRET|DATABASE_URL|POSTGRES_URL|POSTGRES_PRISMA_URL|DIRECT_URL|DB_PASSWORD)\b/;
    const violations = scanDir(srcDir, forbiddenPattern);
    expect(violations).toEqual([]);
  });

  it('5. Turnstile Site Key oficial debe ser exactamente 0x4AAAAAAFOjgftMybjD3w5c', async () => {
    const { DEFAULT_TURNSTILE_SITE_KEY } = await import('../src/components/CloudflareTurnstile');
    expect(DEFAULT_TURNSTILE_SITE_KEY).toBe('0x4AAAAAAFOjgftMybjD3w5c');
  });

  it('6. Dominio canónico inmutable debe ser https://bingoclubvnzla.vercel.app', async () => {
    const { CANONICAL_PRODUCTION_URL, CANONICAL_PRODUCTION_HOST } = await import('../src/lib/canonicalConfig');
    expect(CANONICAL_PRODUCTION_URL).toBe('https://bingoclubvnzla.vercel.app');
    expect(CANONICAL_PRODUCTION_HOST).toBe('bingoclubvnzla.vercel.app');
  });

  it('7. Escaneo del bundle dist/ no debe contener credenciales privadas ni secretos', () => {
    const distAssetsDir = path.join(rootDir, 'dist', 'assets');
    if (!fs.existsSync(distAssetsDir)) return;

    const files = fs.readdirSync(distAssetsDir);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    expect(jsFiles.length).toBeGreaterThan(0);

    for (const jsFile of jsFiles) {
      const content = fs.readFileSync(path.join(distAssetsDir, jsFile), 'utf-8');
      expect(content).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(content).not.toContain('TURNSTILE_SECRET_KEY');
      expect(content).not.toContain('GOOGLE_CLIENT_SECRET');
      expect(content).not.toContain('JWT_SECRET');
    }
  });
});
