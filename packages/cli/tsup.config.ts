import { defineConfig } from 'tsup';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const apiUrlKey = 'SKILLSBAY_API_URL';

function readDotEnvValue(path: string, key: string): string | undefined {
  if (!existsSync(path)) return undefined;

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=\\s*(.*?)\\s*$`));
    if (!match) continue;

    const value = match[1]!.replace(/^['"]|['"]$/g, '').trim();
    if (value) return value;
  }

  return undefined;
}

// Releases receive this value from GitHub Actions. Local builds use the root
// .env file, which is ignored by git. This is deliberately build-time config:
// the published CLI must not accept a runtime API-origin override.
const configuredApiUrl =
  process.env[apiUrlKey] ??
  readDotEnvValue(resolve(import.meta.dirname, '../../.env'), apiUrlKey) ??
  'https://skillsbay.dev';

const apiUrl = new URL(configuredApiUrl).origin;

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
  },
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  sourcemap: false,
  dts: false,
  define: {
    __SKILLSBAY_API_URL__: JSON.stringify(apiUrl),
  },
});
