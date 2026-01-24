import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json to get all dependencies
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
const allDeps = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
];

await esbuild.build({
  entryPoints: [resolve(__dirname, 'server/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: resolve(__dirname, 'dist'),
  // Externalize all dependencies from package.json
  external: allDeps,
});

console.log('Server build complete!');
