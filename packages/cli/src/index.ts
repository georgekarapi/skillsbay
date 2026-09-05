#!/usr/bin/env node
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises"
import { spawn } from "node:child_process"
import { platform } from "node:os"
import { dirname, join, resolve } from "node:path"
import { Command } from "commander"
import { wrapFetchWithPayment, x402Client } from "@x402/fetch"
import { registerExactEvmScheme } from "@x402/evm/exact/client"
import { privateKeyToAccount } from "viem/accounts"

const apiUrl = process.env.SKILLSBAY_API_URL ?? "https://skillsbay.karapi.workers.dev"
type WalletMode = "auto" | "env"
type AgentTarget = "auto" | "agents" | "claude"

function endpoint(path: string) { return new URL(path, apiUrl).toString() }

function sleep(milliseconds: number) { return new Promise((resolve) => setTimeout(resolve, milliseconds)) }

async function completeBrowserCheckout(skillId: string) {
  const [username, skillSlug] = skillId.split("/")
  if (!username || !skillSlug) throw new Error("Skill IDs must use username/skill-slug")
  const createResponse = await fetch(endpoint(`/v1/install-requests/${username}/${skillSlug}`), { method: "POST" })
  if (!createResponse.ok) throw new Error(`${createResponse.status} ${await createResponse.text()}`)
  const created = await createResponse.json() as { data: { id: string; expiresAt: string } }
  const checkoutUrl = new URL(`/${username}/${skillSlug}`, apiUrl)
  checkoutUrl.searchParams.set("checkout", created.data.id)
  console.log(`No agent wallet is configured. Complete the purchase in your browser:\n${checkoutUrl}\nWaiting for payment confirmation until ${new Date(created.data.expiresAt).toLocaleTimeString()}…`)
  const command = platform() === "darwin" ? "open" : platform() === "win32" ? "cmd" : "xdg-open"
  const args = platform() === "win32" ? ["/c", "start", "", checkoutUrl.toString()] : [checkoutUrl.toString()]
  try { spawn(command, args, { detached: true, stdio: "ignore" }).unref() } catch { /* The printed URL remains usable in headless terminals. */ }
  while (true) {
    await sleep(2_000)
    const response = await fetch(endpoint(`/v1/install-requests/${created.data.id}`))
    if (response.status === 410) throw new Error("Browser checkout expired before payment was confirmed.")
    if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
    const payload = await response.json() as { data: { status: "pending" | "completed"; markdown?: string } }
    if (payload.data.status === "completed" && payload.data.markdown) return payload.data.markdown
  }
}

async function api(path: string, init?: RequestInit) {
  const response = await fetch(endpoint(path), init)
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
  return response.json() as Promise<{ data: unknown }>
}

async function paymentFetch() {
  const privateKey = process.env.SKILLSBAY_PRIVATE_KEY
  if (!privateKey) throw new Error("SKILLSBAY_PRIVATE_KEY is required for --wallet env")
  const client = new x402Client()
  registerExactEvmScheme(client, { signer: privateKeyToAccount(privateKey as `0x${string}`), networks: ["eip155:84532"] })
  return wrapFetchWithPayment(fetch, client)
}

async function installSkill(skillId: string, markdown: string, agent: AgentTarget, force: boolean) {
  const cwd = process.cwd()
  const agentsDir = resolve(cwd, ".agents/skills")
  const claudeDir = resolve(cwd, ".claude/skills")
  const root = agent === "agents" ? agentsDir : agent === "claude" ? claudeDir : await exists(agentsDir) ? agentsDir : await exists(claudeDir) ? claudeDir : agentsDir
  const [namespace, slug] = skillId.split("/")
  if (!namespace || !slug) throw new Error("Skill IDs must use namespace/slug")
  const target = join(root, namespace, slug, "SKILL.md")
  if (await exists(target)) {
    const existing = await readFile(target, "utf8")
    if (existing === markdown) return { target, changed: false }
    if (!force) throw new Error(`${target} already exists with different content. Re-run with --force to replace it.`)
  }
  await mkdir(dirname(target), { recursive: true })
  const temporary = `${target}.tmp-${process.pid}`
  await writeFile(temporary, markdown, "utf8")
  await rename(temporary, target)
  return { target, changed: true }
}

async function exists(path: string) { try { await stat(path); return true } catch { return false } }

const program = new Command()
program.name("skillsbay").description("Pay-per-skill package manager for AI agents").version("0.2.2")

program.command("search [query]").description("Search the marketplace").action(async (query = "") => {
  const payload = await api(`/v1/skills?query=${encodeURIComponent(query)}`) as { data: Array<{ id: string; title: string; priceUsdc: string; paidInstalls: number }> }
  for (const skill of payload.data) console.log(`${skill.id}\n  ${skill.title} · $${skill.priceUsdc} USDC · ${skill.paidInstalls.toLocaleString()} paid installs`)
})

program.command("info <skill>").description("Inspect a skill").action(async (skillId) => {
  const [namespace, slug] = skillId.split("/")
  if (!namespace || !slug) throw new Error("Skill IDs must use namespace/slug")
  const payload = await api(`/v1/skills/${namespace}/${slug}`) as { data: Record<string, unknown> }
  console.log(JSON.stringify(payload.data, null, 2))
})

program.command("add <skill>").description("Purchase and install a skill").option("--wallet <mode>", "auto or env (an x402-funded agent wallet)", "auto").option("--agent <target>", "auto, agents, or claude", "auto").option("--force", "replace a conflicting local skill").action(async (skillId, options: { wallet: WalletMode; agent: AgentTarget; force?: boolean }) => {
  if (options.wallet !== "auto" && options.wallet !== "env") throw new Error("Only --wallet env is supported. Set SKILLSBAY_PRIVATE_KEY for the funded agent wallet.")
  if (!process.env.SKILLSBAY_PRIVATE_KEY) {
    const markdown = await completeBrowserCheckout(skillId)
    const result = await installSkill(skillId, markdown, options.agent, Boolean(options.force))
    console.log(result.changed ? `Installed ${skillId} at ${result.target}` : `${skillId} is already installed at ${result.target}`)
    return
  }
  const paidFetch = await paymentFetch()
  const response = await paidFetch(endpoint(`/v1/install/${skillId}/content`))
  if (response.status === 202) {
    console.log("Payment settled. Waiting for the purchase receipt to be indexed by The Graph.")
    return
  }
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
  const result = await installSkill(skillId, await response.text(), options.agent, Boolean(options.force))
  console.log(result.changed ? `Installed ${skillId} at ${result.target}` : `${skillId} is already installed at ${result.target}`)
})

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
