import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  // Mark all node_modules as external to avoid bundling native modules
  packages: 'external',
  // But we need to bundle our own server code, so we use a plugin
  plugins: [{
    name: 'externalize-deps',
    setup(build) {
      // Mark all node_modules as external
      build.onResolve({ filter: /^[^./]|^\.[^./]|^\.\.[^/]/ }, args => {
        if (args.path.startsWith('.') || args.path.startsWith('/')) {
          return null; // Let esbuild handle relative imports
        }
        return { path: args.path, external: true };
      });
    }
  }],
});

console.log('Server build complete!');
