import { defineConfig } from 'tsup';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const apiUrlKey = 'SKILLSBAY_API_URL';
const x402NetworkKey = 'SKILLSBAY_X402_NETWORK';

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
const x402Network = process.env[x402NetworkKey] ??
  readDotEnvValue(resolve(import.meta.dirname, '../../.env'), x402NetworkKey) ??
  'eip155:84532';

if (!['eip155:84532', 'eip155:8453'].includes(x402Network)) {
  throw new Error(`${x402NetworkKey} must be eip155:84532 or eip155:8453`);
}

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
    __SKILLSBAY_X402_NETWORK__: JSON.stringify(x402Network),
  },
});
