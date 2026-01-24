import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json to get all dependencies
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
const allDeps = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
]);

// Plugin to externalize node_modules but not local files
const externalizePlugin = {
  name: 'externalize-deps',
  setup(build) {
    // Externalize bare imports (node_modules)
    build.onResolve({ filter: /.*/ }, (args) => {
      // Skip entry points
      if (args.kind === 'entry-point') {
        return null;
      }
      
      // Skip relative imports (local files)
      if (args.path.startsWith('.') || args.path.startsWith('/')) {
        return null;
      }
      
      // Check if it's a dependency from package.json
      const pkgName = args.path.startsWith('@') 
        ? args.path.split('/').slice(0, 2).join('/')
        : args.path.split('/')[0];
      
      if (allDeps.has(pkgName)) {
        return { path: args.path, external: true };
      }
      
      return null;
    });
  }
};

await esbuild.build({
  entryPoints: [resolve(__dirname, 'server/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: resolve(__dirname, 'dist'),
  plugins: [externalizePlugin],
});

console.log('Server build complete!');
