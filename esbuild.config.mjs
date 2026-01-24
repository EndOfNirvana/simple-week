import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

// Read package.json to get all dependencies
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const allDeps = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
];

await esbuild.build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  // Externalize all dependencies from package.json
  external: allDeps,
});

console.log('Server build complete!');
