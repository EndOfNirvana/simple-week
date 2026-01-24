import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['server/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: false, // Don't clean because vite already built client
  skipNodeModulesBundle: true, // Externalize all node_modules
  noExternal: [], // Bundle nothing from node_modules
});
