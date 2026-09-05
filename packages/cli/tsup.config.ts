import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
  },
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  sourcemap: false,
  dts: false,
});
