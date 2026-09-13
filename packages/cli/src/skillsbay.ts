import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, symlink, writeFile } from 'node:fs/promises';
import { platform } from 'node:os';
import { dirname, join } from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';
import {
  agents,
  detectInstalledAgents,
  getNonUniversalAgents,
  getUniversalAgents,
  getVisibleUniversalAgents,
  isUniversalAgent,
} from './agents.ts';
import { getAgentBaseDir, getCanonicalSkillsDir, sanitizeName } from './installer.ts';
import { getLastSelectedAgents, saveSelectedAgents } from './skill-lock.ts';
import { searchMultiselect } from './prompts/search-multiselect.ts';
import type { AgentType } from './types.ts';

const isCancelled = (value: unknown): value is symbol => typeof value === 'symbol';

// This value is injected at build time by tsup. Do not read an API origin from
// process.env here: a published CLI must always use the origin it was released
// against.
export const apiUrl = __SKILLSBAY_API_URL__;

const configuredApiOrigin = new URL(apiUrl).origin;

export function endpoint(path: string): string {
  return new URL(path, apiUrl).toString();
}

export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

const READ_RETRY_DELAYS_MS = [250, 750] as const;

/**
 * Retry idempotent API reads when Node cannot establish a connection to the
 * Worker. This is intentionally not used for payment or checkout-creation
 * POSTs, which must not be repeated without an idempotency contract.
 */
export async function fetchApiRead(input: string, init?: RequestInit): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= READ_RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fetch(input, init);
    } catch (error) {
      lastError = error;
      const delay = READ_RETRY_DELAYS_MS[attempt];
      if (delay !== undefined) await sleep(delay);
    }
  }

  throw lastError;
}

function describeNetworkError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  const cause = error.cause;
  const causes = cause instanceof AggregateError ? [...cause.errors] : [cause];
  const codes = causes.flatMap((candidate) => {
    if (typeof candidate !== 'object' || candidate === null || !('code' in candidate)) return [];
    const code = (candidate as { code?: unknown }).code;
    return typeof code === 'string' ? [code] : [];
  });
  if (codes.length > 0) {
    return `${error.message} (${[...new Set(codes)].join(', ')})`;
  }
  return error.message;
}

export interface SkillInfo {
  id: string;
  title: string;
  description?: string;
  priceUsdc: string;
  paidInstalls: number;
  ownerAddress?: string;
  [key: string]: unknown;
}

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const response = init ? await fetch(endpoint(path), init) : await fetchApiRead(endpoint(path));
  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

export async function resolveSkillsbaySkillId(source: string): Promise<string | null> {
  let raw = source.trim();
  if (raw.startsWith('skillsbay:')) {
    raw = raw.slice('skillsbay:'.length);
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const url = new URL(raw);
      if (url.origin === configuredApiOrigin) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          raw = `${parts[0]}/${parts[1]}`;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }

  const parts = raw.split('/');
  if (parts.length === 2 && parts[0] && parts[1]) {
    const skillId = `${parts[0]}/${parts[1]}`;
    try {
      const response = await fetchApiRead(
        endpoint(`/v1/skills/${encodeURIComponent(parts[0])}/${encodeURIComponent(parts[1])}`)
      );
      if (response.status === 404) {
        throw new Error(`Skill "${skillId}" was not found on SkillsBay. Use --fallback to install it directly from GitHub instead.`);
      }
      if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
      const payload = await response.json() as { data?: SkillInfo };
      return payload.data?.id ? skillId : null;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Skill "')) throw error;
      const detail = describeNetworkError(error);
      throw new Error(
        `Could not reach the SkillsBay API embedded in this CLI (${apiUrl}) to resolve "${skillId}". ` +
          `Use an explicit Git URL for a repository install while the network is unavailable. (${detail})`
      );
    }
  }

  return null;
}

export async function fetchSkillInfo(skillId: string): Promise<SkillInfo | null> {
  const [namespace, slug] = skillId.split('/');
  if (!namespace || !slug) return null;
  try {
    const payload = await api<{ data: SkillInfo }>(`/v1/skills/${namespace}/${slug}`);
    return payload.data;
  } catch {
    return null;
  }
}

export async function searchSkills(query = ''): Promise<SkillInfo[]> {
  const payload = await api<{ data: SkillInfo[] }>(`/v1/skills?query=${encodeURIComponent(query)}`);
  return payload.data;
}

export async function paymentFetch() {
  const privateKey = process.env.SKILLSBAY_PRIVATE_KEY;
  if (!privateKey) throw new Error('SKILLSBAY_PRIVATE_KEY is required for wallet payment');
  const client = new x402Client();
  registerExactEvmScheme(client, {
    signer: privateKeyToAccount(normalizePrivateKey(privateKey)),
    networks: ['eip155:84532'],
  });
  return wrapFetchWithPayment(fetch, client);
}

export async function completeBrowserCheckout(
  skillId: string,
  onUrlPrompt?: (url: URL, expiresAt: Date) => void
): Promise<string> {
  const [username, skillSlug] = skillId.split('/');
  if (!username || !skillSlug) throw new Error('Skill IDs must use username/skill-slug');

  const createResponse = await fetch(endpoint(`/v1/install-requests/${username}/${skillSlug}`), {
    method: 'POST',
  });
  if (!createResponse.ok) throw new Error(`${createResponse.status} ${await createResponse.text()}`);

  const created = (await createResponse.json()) as { data: { id: string; redemptionToken: string; expiresAt: string } };
  const checkoutUrl = new URL(`/${username}/${skillSlug}`, apiUrl);
  checkoutUrl.searchParams.set('checkout', created.data.id);

  const expiresDate = new Date(created.data.expiresAt);
  if (onUrlPrompt) {
    onUrlPrompt(checkoutUrl, expiresDate);
  }

  const command = platform() === 'darwin' ? 'open' : platform() === 'win32' ? 'cmd' : 'xdg-open';
  const args = platform() === 'win32' ? ['/c', 'start', '', checkoutUrl.toString()] : [checkoutUrl.toString()];
  try {
    spawn(command, args, { detached: true, stdio: 'ignore' }).unref();
  } catch {
    // The printed URL remains usable in headless terminals.
  }

  while (true) {
    await sleep(2000);
    const response = await fetchApiRead(endpoint(`/v1/install-requests/${created.data.id}`), {
      headers: { authorization: `Bearer ${created.data.redemptionToken}` },
    });
    if (response.status === 410) throw new Error('Browser checkout expired before payment was confirmed.');
    if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);

    const payload = (await response.json()) as { data: { status: 'pending' | 'completed'; markdown?: string } };
    if (payload.data.status === 'completed' && payload.data.markdown) {
      return payload.data.markdown;
    }
  }
}

export async function completeWalletPayment(skillId: string): Promise<string> {
  const paidFetch = await paymentFetch();
  const response = await paidFetch(endpoint(`/v1/install/${skillId}/content`));
  if (response.status === 202) {
    throw new Error('Payment settled. Waiting for the purchase receipt to be indexed by The Graph.');
  }
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response.text();
}

function normalizePrivateKey(privateKey: string): `0x${string}` {
  return (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`;
}

function authorBundleReadMessage(skillId: string, author: string, issuedAt: string) {
  return [
    'SkillsBay bundle read authorization',
    `Skill: ${skillId}`,
    `Author: ${author.toLowerCase()}`,
    `Issued at: ${issuedAt}`,
  ].join('\n');
}

/** Returns the private bundle without payment when this agent wallet is its on-chain author. */
export async function getAuthorBundleFromWallet(skillId: string): Promise<string | null> {
  const privateKey = process.env.SKILLSBAY_PRIVATE_KEY;
  if (!privateKey) return null;
  const account = privateKeyToAccount(normalizePrivateKey(privateKey));
  const issuedAt = new Date().toISOString();
  const signature = await account.signMessage({ message: authorBundleReadMessage(skillId, account.address, issuedAt) });
  const response = await fetch(endpoint(`/v1/publish/bundles/${skillId}/read`), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ author: account.address, issuedAt, signature }),
  });
  if (response.status === 403) return null;
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  const payload = (await response.json()) as { data: { markdown: string } };
  return payload.data.markdown;
}

export function ensureUniversalAgents(targetAgents: AgentType[]): AgentType[] {
  const universalAgents = getUniversalAgents();
  const result = [...targetAgents];
  for (const ua of universalAgents) {
    if (!result.includes(ua)) {
      result.push(ua);
    }
  }
  return result;
}

export async function selectAgentsInteractive(options: {
  global?: boolean;
}): Promise<AgentType[] | symbol> {
  const supportsGlobalFilter = (a: AgentType) => !options.global || agents[a]?.globalSkillsDir;

  const universalAgents = getUniversalAgents().filter(supportsGlobalFilter);
  const visibleUniversalAgents = getVisibleUniversalAgents().filter(supportsGlobalFilter);
  const otherAgents = getNonUniversalAgents().filter(
    (agent) => agent !== 'eve' && supportsGlobalFilter(agent)
  );

  const universalSection = {
    title: 'Universal (.agents/skills)',
    items: visibleUniversalAgents.map((a) => ({
      value: a,
      label: agents[a].displayName,
    })),
    hiddenCount: universalAgents.length - visibleUniversalAgents.length,
  };

  const otherChoices = otherAgents.map((a) => ({
    value: a,
    label: agents[a].displayName,
    hint: options.global ? agents[a].globalSkillsDir! : agents[a].skillsDir,
  }));

  let lastSelected: string[] | undefined;
  try {
    lastSelected = await getLastSelectedAgents();
  } catch {
    // ignore
  }

  const initialSelected = lastSelected
    ? (lastSelected.filter(
        (a) => otherAgents.includes(a as AgentType) && !universalAgents.includes(a as AgentType)
      ) as AgentType[])
    : [];

  const selected = await searchMultiselect({
    message: 'Which agents do you want to install to?',
    items: otherChoices,
    initialSelected,
    lockedSection: universalSection,
  });

  if (!isCancelled(selected)) {
    try {
      await saveSelectedAgents(selected as string[]);
    } catch {
      // ignore
    }
  }

  return selected as AgentType[] | symbol;
}

export async function installSkillsbaySkill(
  skillId: string,
  markdown: string,
  targetAgents: AgentType[],
  options: { global?: boolean; cwd?: string; force?: boolean } = {}
) {
  const isGlobal = options.global ?? false;
  const cwd = options.cwd || process.cwd();
  const [namespace, slug] = skillId.split('/');
  if (!namespace || !slug) throw new Error('Skill IDs must use namespace/slug');

  const canonicalBase = getCanonicalSkillsDir(isGlobal, cwd);
  // Agent skill directories are flat by convention: the marketplace namespace
  // identifies the publisher, while the skill slug is the local capability name.
  const canonicalSkillDir = join(canonicalBase, sanitizeName(slug));
  const targetFile = join(canonicalSkillDir, 'SKILL.md');

  await mkdir(canonicalSkillDir, { recursive: true });

  let changed = true;
  if (existsSync(targetFile)) {
    const existing = await readFile(targetFile, 'utf8');
    if (existing === markdown) {
      changed = false;
    }
  }

  if (changed || options.force) {
    const temporary = `${targetFile}.tmp-${process.pid}`;
    await writeFile(temporary, markdown, 'utf8');
    await rename(temporary, targetFile);
  }

  const installedAgents: string[] = [];

  for (const agentType of targetAgents) {
    const agent = agents[agentType];
    if (!agent) continue;
    installedAgents.push(agent.displayName);

    if (isUniversalAgent(agentType)) {
      continue;
    }

    const agentBase = getAgentBaseDir(agentType, isGlobal, cwd);
    const agentSkillDir = join(agentBase, sanitizeName(slug));

    try {
      await mkdir(dirname(agentSkillDir), { recursive: true });
      try {
        await symlink(canonicalSkillDir, agentSkillDir, platform() === 'win32' ? 'junction' : undefined);
      } catch {
        await mkdir(agentSkillDir, { recursive: true });
        await writeFile(join(agentSkillDir, 'SKILL.md'), markdown, 'utf8');
      }
    } catch {
      // Ignore linking errors, canonical install is preserved
    }
  }

  return {
    skillId,
    canonicalPath: targetFile,
    installedAgents,
    changed,
  };
}

export interface SkillsbayAddOptions {
  global?: boolean;
  agent?: string[];
  yes?: boolean;
  force?: boolean;
  wallet?: 'auto' | 'env';
}

async function selectInstallationScope(
  targetAgents: AgentType[],
  options: SkillsbayAddOptions
): Promise<boolean | symbol> {
  let installGlobally = options.global ?? false;
  const supportsGlobal = targetAgents.some((agent) => agents[agent]?.globalSkillsDir !== undefined);

  if (options.global === undefined && !options.yes && supportsGlobal) {
    const scope = await p.select({
      message: 'Installation scope',
      options: [
        {
          value: false,
          label: 'Project',
          hint: 'Install in the current directory (committed with your project)',
        },
        {
          value: true,
          label: 'Global',
          hint: 'Install in your home directory (available across all projects)',
        },
      ],
    });

    if (isCancelled(scope)) return scope;
    installGlobally = scope as boolean;
  }

  return installGlobally;
}

function existingSkillsbayInstallTargets(
  skillId: string,
  targetAgents: AgentType[],
  options: { global: boolean; cwd?: string }
): Array<{ path: string; agents: string[] }> {
  const [, slug] = skillId.split('/');
  if (!slug) return [];

  const skillDirectory = sanitizeName(slug);
  const paths = new Map<string, string[]>();
  const addTarget = (path: string, agentName: string) => {
    const agentsAtPath = paths.get(path) ?? [];
    agentsAtPath.push(agentName);
    paths.set(path, agentsAtPath);
  };

  for (const agentType of targetAgents) {
    const agent = agents[agentType];
    if (!agent) continue;
    const base = isUniversalAgent(agentType)
      ? getCanonicalSkillsDir(options.global, options.cwd)
      : getAgentBaseDir(agentType, options.global, options.cwd);
    addTarget(join(base, skillDirectory), agent.displayName);
  }

  return [...paths.entries()]
    .filter(([path]) => existsSync(path))
    .map(([path, agentNames]) => ({ path, agents: agentNames }));
}

async function confirmSkillsbayOverwrite(
  skillId: string,
  targetAgents: AgentType[],
  options: SkillsbayAddOptions & { global: boolean }
): Promise<boolean> {
  const existingTargets = existingSkillsbayInstallTargets(skillId, targetAgents, options);
  if (existingTargets.length === 0) return true;

  const overwriteLines = existingTargets.map(({ path, agents }) =>
    `${pc.cyan(path)}\n  ${pc.yellow('overwrites:')} ${agents.join(', ')}`
  );
  p.note(overwriteLines.join('\n\n'), 'Installation Summary');

  if (options.yes || options.force) return true;

  const confirmed = await p.confirm({ message: 'Proceed and replace the existing skill?' });
  return !isCancelled(confirmed) && confirmed;
}

export async function runSkillsbayAdd(skillId: string, options: SkillsbayAddOptions = {}): Promise<void> {
  const spinner = p.spinner();

  p.intro(pc.bgCyan(pc.black(' skillsbay ')));
  spinner.start('Checking skill info…');
  const skillInfo = await fetchSkillInfo(skillId);
  const skillTitle = skillInfo?.title || skillId;
  const priceText = skillInfo?.priceUsdc ? `$${skillInfo.priceUsdc} USDC` : 'free';
  spinner.stop(`Source: skillsbay:${skillId}`);

  p.log.step(`Found 1 skill: ${pc.cyan(skillTitle)} (${priceText})`);
  p.log.step(`Selected 1 skill: ${pc.cyan(skillId)}`);

  let targetAgents: AgentType[] = [];
  if (options.agent && options.agent.length > 0) {
    targetAgents = options.agent as AgentType[];
  } else {
    spinner.start('Loading agents…');
    const installedAgents = await detectInstalledAgents();
    const totalAgents = Object.keys(agents).length;
    spinner.stop(`${totalAgents} agents`);

    if (options.yes || !process.stdin.isTTY) {
      targetAgents = ensureUniversalAgents(installedAgents);
      if (installedAgents.length === 1) {
        p.log.info(`Installing to: ${pc.cyan(agents[installedAgents[0]!].displayName)}`);
      } else {
        p.log.info(`Installing to: ${installedAgents.map((a) => pc.cyan(agents[a].displayName)).join(', ')}`);
      }
    } else {
      const selected = await selectAgentsInteractive({ global: options.global });
      if (isCancelled(selected)) {
        p.cancel('Installation cancelled');
        return;
      }
      targetAgents = selected as AgentType[];
    }
  }

  const installGlobally = await selectInstallationScope(targetAgents, options);
  if (isCancelled(installGlobally)) {
    p.cancel('Installation cancelled');
    return;
  }

  const overwriteConfirmed = await confirmSkillsbayOverwrite(skillId, targetAgents, {
    ...options,
    global: installGlobally,
  });
  if (!overwriteConfirmed) {
    p.cancel('Installation cancelled');
    return;
  }

  let markdown = '';
  const hasWalletKey = !!process.env.SKILLSBAY_PRIVATE_KEY;
  const walletMode = options.wallet || (hasWalletKey ? 'env' : 'auto');

  if (walletMode === 'env' && hasWalletKey) {
    spinner.start('Checking author access…');
    try {
      markdown = (await getAuthorBundleFromWallet(skillId)) ?? '';
      if (markdown) {
        spinner.stop('Author access confirmed — no payment needed');
      } else {
        spinner.start('Purchasing via agent wallet (x402 EVM exact scheme)…');
        markdown = await completeWalletPayment(skillId);
        spinner.stop('Payment settled and confirmed');
      }
    } catch (err: unknown) {
      spinner.stop('Wallet payment failed');
      throw err;
    }
  } else {
    const paymentSpinner = p.spinner();
    let isWaitingForPayment = false;
    try {
      markdown = await completeBrowserCheckout(skillId, (checkoutUrl) => {
        console.log(
          `\n  ${pc.dim('No agent wallet is configured. Complete the purchase in your browser:')}\n  ${pc.underline(pc.cyan(checkoutUrl.toString()))}\n`
        );
        isWaitingForPayment = true;
        paymentSpinner.start('Waiting for payment confirmation…');
      });
      if (isWaitingForPayment) paymentSpinner.stop('Payment confirmed');
    } catch (error) {
      if (isWaitingForPayment) paymentSpinner.stop('Payment confirmation failed');
      throw error;
    }
  }

  spinner.start('Installing skill…');
  const installResult = await installSkillsbaySkill(skillId, markdown, targetAgents, {
    global: installGlobally,
    force: options.force,
  });
  spinner.stop('Installation complete');

  console.log();
  p.note(
    `Installed ${pc.bold(skillId)} at ${pc.cyan(installResult.canonicalPath)}\nAgents: ${installResult.installedAgents.join(', ')}`,
    'Installation Summary'
  );
  p.outro(pc.green('✔ Done!'));
}
