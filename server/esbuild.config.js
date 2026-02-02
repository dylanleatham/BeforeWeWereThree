import * as esbuild from 'esbuild';
import { copyFileSync, cpSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const deployDir = join(__dirname, 'deploy');
const prismaDir = join(__dirname, 'prisma');

// Ensure deploy directory exists
mkdirSync(deployDir, { recursive: true });
mkdirSync(join(deployDir, 'prisma'), { recursive: true });

// Bundle the server
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: 'deploy/index.js',
  external: ['@prisma/client'], // Prisma has native binaries, can't bundle
  sourcemap: false,
  minify: true,
  banner: {
    // Fix for __dirname in ESM bundles
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
});

// Create minimal package.json for production
const prodPackageJson = {
  name: 'bwwt-server',
  version: '1.0.0',
  type: 'module',
  scripts: {
    start: 'node index.js',
    postinstall: 'prisma generate',
  },
  dependencies: {
    '@prisma/client': '^6.19.2',
    'prisma': '^6.19.2',
  },
  prisma: {
    schema: './prisma/schema.prisma',
  },
};

writeFileSync(join(deployDir, 'package.json'), JSON.stringify(prodPackageJson, null, 2));

// Copy Prisma schema (needed for migrations and client generation)
copyFileSync(join(prismaDir, 'schema.prisma'), join(deployDir, 'prisma', 'schema.prisma'));

// Copy migrations folder if it exists (needed for prisma migrate deploy)
const migrationsDir = join(prismaDir, 'migrations');
if (existsSync(migrationsDir)) {
  cpSync(migrationsDir, join(deployDir, 'prisma', 'migrations'), { recursive: true });
  console.log('Copied migrations folder');
}

console.log('Build complete. Output in ./deploy/');
