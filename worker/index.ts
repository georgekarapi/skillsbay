import { Hono } from "hono"
import { cors } from "hono/cors"
import { paymentMiddleware, x402ResourceServer } from "@x402/hono"
import { HTTPFacilitatorClient } from "@x402/core/server"
import { ExactEvmScheme } from "@x402/evm/exact/server"
import { createPublicClient, decodeFunctionData, encodeFunctionData, encodePacked, hexToBigInt, http, keccak256, maxUint256, parseAbi, parseErc6492Signature, stringToHex, verifyMessage } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { createBundlerClient, toSimple7702SmartAccount } from "viem/account-abstraction"
import { baseSepolia } from "viem/chains"
import { getBundle, putBundle } from "./storage"
import { createBundleReadAuthorizationMessage, createPublishAuthorizationMessage, createUsernameAuthorizationMessage } from "../shared/publish-authorization"

type Bindings = {
  APP_ENV: string
  DB: D1Database
  SKILL_BUNDLES: R2Bucket
  INTERNAL_PUBLISH_TOKEN?: string
  GRAPH_API_URL?: string
  GRAPH_API_KEY?: string
  X402_RECIPIENT_ADDRESS?: string
  SKILL_REGISTRY_ADDRESS?: string
  BASE_SEPOLIA_RPC_URL?: string
  RECORDER_PRIVATE_KEY?: string
  BUNDLER_RPC_URL?: string
  CIRCLE_PAYMASTER_ADDRESS?: string
  CIRCLE_PAYMASTER_PERMIT_USDC?: string
  USDC_ADDRESS?: string
}

type Listing = { id: string; namespace: string; slug: string; title: string; summary: string; category: string; priceUsdc: string; paidInstalls: number; trend: number; author: string; authorAddress: string; version: string; updatedAt: string }

type SkillDbRow = {
  id: string
  namespace: string
  slug: string
  title: string
  summary: string
  category: string
  price_usdc: string
  paid_installs: number
  trend: number
  author: string
  author_address: string
  version: string
  updated_at: string
  featured?: number
}

const app = new Hono<{ Bindings: Bindings }>()
app.use("/v1/*", cors({ origin: "*", allowHeaders: ["Content-Type", "Authorization", "PAYMENT-SIGNATURE"], allowMethods: ["GET", "POST", "PUT", "OPTIONS"] }))

function splitSkillId(skillId: string) {
  const [namespace, slug] = skillId.split("/")
  if (!namespace || !slug || skillId.split("/").length !== 2 || !/^[a-z0-9-]+$/.test(namespace) || !/^[a-z0-9-]+$/.test(slug)) return null
  return { namespace, slug }
}

function skillIdFromParams(request: { param(name: string): string }) {
  return `${request.param("namespace")}/${request.param("slug")}`
}

function isWalletAddress(value: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(value)
}

function isUsername(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length >= 3 && value.length <= 32
}

async function graphListings(env: Bindings): Promise<Listing[] | null> {
  if (!env.GRAPH_API_URL) return null
  const response = await fetch(env.GRAPH_API_URL, { method: "POST", headers: { "content-type": "application/json", ...(env.GRAPH_API_KEY ? { authorization: `Bearer ${env.GRAPH_API_KEY}` } : {}) }, body: JSON.stringify({ query: "{ skills(first: 50, orderBy: totalSales, orderDirection: desc) { id price majorVersion totalSales author { id } metadataURI } }" }) })
  if (!response.ok) throw new Error(`The Graph query failed (${response.status})`)
  const payload = await response.json() as { data?: { skills?: Array<{ id: string; price: string; majorVersion: number; totalSales: number; author: { id: string }; metadataURI: string }> }; errors?: Array<{ message: string }> }
  if (payload.errors?.length) throw new Error(payload.errors.map((error) => error.message).join(", "))
  return (payload.data?.skills ?? []).map((skill): Listing => {
    const sourceId = skill.metadataURI.startsWith("skillsbay://") ? skill.metadataURI.slice("skillsbay://".length) : skill.id
    const parsed = splitSkillId(sourceId)
    const namespace = parsed?.namespace ?? "onchain"
    const slug = parsed?.slug ?? skill.id.slice(2, 10)
    return {
      id: parsed ? sourceId : skill.id,
      namespace,
      slug,
      title: slug.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" "),
      summary: "A paid agent skill published on SkillsBay.",
      category: "Agent skill",
      priceUsdc: (Number(skill.price) / 1_000_000).toFixed(2),
      paidInstalls: skill.totalSales,
      trend: 0,
      author: namespace,
      authorAddress: skill.author.id,
      version: `${skill.majorVersion}.0.0`,
      updatedAt: "Indexed on Base Sepolia",
    }
  })
}

async function dbListings(env: Bindings): Promise<Listing[]> {
  try {
    const result = await env.DB.prepare(
      "SELECT id, namespace, slug, title, summary, category, price_usdc, paid_installs, trend, author, author_address, version, updated_at FROM skills ORDER BY paid_installs DESC, id ASC"
    ).all<SkillDbRow>()

    return (result.results ?? []).map((row: SkillDbRow) => ({
      id: row.id,
      namespace: row.namespace,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      category: row.category,
      priceUsdc: row.price_usdc,
      paidInstalls: row.paid_installs,
      trend: row.trend,
      author: row.author,
      authorAddress: row.author_address,
      version: row.version,
      updatedAt: row.updated_at,
    }))
  } catch (error) {
    console.error("Local database skills query failed", error)
    return []
  }
}

async function listings(env: Bindings) {
  if (env.GRAPH_API_URL) {
    try {
      const data = await graphListings(env)
      if (data && data.length > 0) {
        return { data, source: "graph" as const }
      }
    } catch (error) {
      console.error("Graph listing query failed, checking local database", error)
    }
  }

  const localSkills = await dbListings(env)
  if (localSkills.length > 0) {
    return { data: localSkills, source: "db" as const }
  }

  return { data: [], source: "unavailable" as const }
}

function isInternalPublisher(request: Request, env: Bindings) {
  const expected = env.INTERNAL_PUBLISH_TOKEN
  return Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`)
}

function usdc(raw: string | number | bigint) {
  return (Number(raw) / 1_000_000).toFixed(2)
}

function parseUsdc(value: string) {
  const [whole, fraction = ""] = value.split(".")
  return BigInt(whole) * 1_000_000n + BigInt((fraction + "000000").slice(0, 6))
}

function safeErrorMessage(error: unknown) {
  const candidate = typeof error === "object" && error && "shortMessage" in error && typeof error.shortMessage === "string"
    ? error.shortMessage
    : error instanceof Error ? error.message : "Unknown recorder error"
  return candidate.replace(/https?:\/\/\S+/g, "[endpoint]").slice(0, 280)
}

const skillRegistryAbi = parseAbi([
  "function recordPurchase(bytes32 skillId, address buyer, uint256 amount, bytes32 paymentTxHash)",
  "function getSkill(bytes32 skillId) view returns (address author, uint96 price, uint32 majorVersion, bool active, string metadataURI)",
  "function processedPaymentTransactions(bytes32 paymentTxHash) view returns (bool)",
  "function hasPurchased(bytes32 skillId, address buyer) view returns (bool)",
  "function recorder() view returns (address)",
])

const usdcPermitAbi = parseAbi([
  "function name() view returns (string)",
  "function version() view returns (string)",
  "function nonces(address owner) view returns (uint256)",
])

const usdcTransferAbi = parseAbi(["function transfer(address to, uint256 value) returns (bool)"])

const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const
const BASE_SEPOLIA_CIRCLE_PAYMASTER_V08 = "0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966" as const

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

async function registeredAuthor(env: Bindings, skillId: string) {
  if (!env.SKILL_REGISTRY_ADDRESS || !env.BASE_SEPOLIA_RPC_URL) return null
  const client = createPublicClient({ transport: http(env.BASE_SEPOLIA_RPC_URL) })
  const skill = await client.readContract({ address: env.SKILL_REGISTRY_ADDRESS as `0x${string}`, abi: skillRegistryAbi, functionName: "getSkill", args: [keccak256(stringToHex(skillId))] })
  return skill[0]
}

async function recordPurchase(env: Bindings, input: { skillId: string; buyer: string; amount: string; paymentTransactionHash: string }) {
  if (!env.SKILL_REGISTRY_ADDRESS || !env.RECORDER_PRIVATE_KEY || !env.BASE_SEPOLIA_RPC_URL) throw new Error("Settlement recorder is not configured")
  const client = createPublicClient({ chain: baseSepolia, transport: http(env.BASE_SEPOLIA_RPC_URL) })
  // Secret managers commonly store private keys without the `0x` prefix. Accept
  // both representations so a valid recorder key cannot silently break checkout.
  const recorderPrivateKey = (env.RECORDER_PRIVATE_KEY.startsWith("0x") ? env.RECORDER_PRIVATE_KEY : `0x${env.RECORDER_PRIVATE_KEY}`) as `0x${string}`
  const owner = privateKeyToAccount(recorderPrivateKey)
  const configuredRecorder = await client.readContract({ address: env.SKILL_REGISTRY_ADDRESS as `0x${string}`, abi: skillRegistryAbi, functionName: "recorder" })
  if (configuredRecorder.toLowerCase() !== owner.address.toLowerCase()) throw new Error(`Recorder key address ${owner.address} does not match registry recorder ${configuredRecorder}`)
  const account = await toSimple7702SmartAccount({ client, owner })
  const usdcAddress = (env.USDC_ADDRESS ?? BASE_SEPOLIA_USDC) as `0x${string}`
  const paymasterAddress = (env.CIRCLE_PAYMASTER_ADDRESS ?? BASE_SEPOLIA_CIRCLE_PAYMASTER_V08) as `0x${string}`
  const permitAmount = BigInt(env.CIRCLE_PAYMASTER_PERMIT_USDC ?? "10000000")
  const paymaster = {
    async getPaymasterData() {
      const [name, version, nonce] = await Promise.all([
        client.readContract({ address: usdcAddress, abi: usdcPermitAbi, functionName: "name" }),
        client.readContract({ address: usdcAddress, abi: usdcPermitAbi, functionName: "version" }),
        client.readContract({ address: usdcAddress, abi: usdcPermitAbi, functionName: "nonces", args: [account.address] }),
      ])
      const signedPermit = await account.signTypedData({
        domain: { name, version, chainId: baseSepolia.id, verifyingContract: usdcAddress },
        // Circle's permit verifier expects the domain definition in the typed data.
        types: {
          EIP712Domain: [{ name: "name", type: "string" }, { name: "version", type: "string" }, { name: "chainId", type: "uint256" }, { name: "verifyingContract", type: "address" }],
          Permit: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }],
        },
        primaryType: "Permit",
        message: { owner: account.address, spender: paymasterAddress, value: permitAmount, nonce, deadline: maxUint256 },
      })
      const { signature } = parseErc6492Signature(signedPermit)
      return {
        paymaster: paymasterAddress,
        paymasterData: encodePacked(["uint8", "address", "uint256", "bytes"], [0, usdcAddress, permitAmount, signature]),
        paymasterVerificationGasLimit: 200_000n,
        paymasterPostOpGasLimit: 35_000n,
        isFinal: true,
      }
    },
  }
  const bundler = createBundlerClient({
    account,
    client,
    paymaster,
    userOperation: {
      estimateFeesPerGas: async ({ bundlerClient }) => {
        const { standard } = await bundlerClient.request({ method: "pimlico_getUserOperationGasPrice" }) as { standard: { maxFeePerGas: `0x${string}`; maxPriorityFeePerGas: `0x${string}` } }
        return { maxFeePerGas: hexToBigInt(standard.maxFeePerGas), maxPriorityFeePerGas: hexToBigInt(standard.maxPriorityFeePerGas) }
      },
    },
    transport: http(env.BUNDLER_RPC_URL ?? `https://public.pimlico.io/v2/${baseSepolia.id}/rpc`),
  })
  const userOperationHash = await bundler.sendUserOperation({
    account,
    calls: [{ to: env.SKILL_REGISTRY_ADDRESS as `0x${string}`, data: encodeFunctionData({ abi: skillRegistryAbi, functionName: "recordPurchase", args: [keccak256(stringToHex(input.skillId)), input.buyer as `0x${string}`, BigInt(input.amount), input.paymentTransactionHash as `0x${string}`] }) }],
    authorization: await owner.signAuthorization({ chainId: baseSepolia.id, nonce: await client.getTransactionCount({ address: owner.address }), contractAddress: account.authorization.address }),
  })
  await bundler.waitForUserOperationReceipt({ hash: userOperationHash })
}

app.get("/v1/health", (c) => c.json({ ok: true, environment: c.env.APP_ENV, services: { graph: Boolean(c.env.GRAPH_API_URL), privateBundles: true, x402: Boolean(c.env.X402_RECIPIENT_ADDRESS), circlePaymaster: Boolean(c.env.RECORDER_PRIVATE_KEY) } }))
app.get("/v1/skills", async (c) => {
  const query = c.req.query("query")?.toLowerCase()
  const result = await listings(c.env)
  const data = query ? result.data.filter((skill) => `${skill.title} ${skill.namespace} ${skill.category}`.toLowerCase().includes(query)) : result.data
  return c.json({ data, source: result.source })
})
app.get("/v1/skills/:namespace/:slug", async (c) => {
  const skill = (await listings(c.env)).data.find((item) => item.namespace === c.req.param("namespace") && item.slug === c.req.param("slug"))
  return skill ? c.json({ data: skill }) : c.json({ error: "Skill not found" }, 404)
})
app.get("/v1/install-requests/:id", async (c) => {
  const request = await c.env.DB.prepare("SELECT id, skill_id, status, expires_at FROM install_requests WHERE id = ?").bind(c.req.param("id")).first<{ id: string; skill_id: string; status: "pending" | "completed"; expires_at: string }>()
  if (!request) return c.json({ error: "Install request not found or already consumed" }, 404)
  if (Date.parse(request.expires_at) <= Date.now()) { await c.env.DB.prepare("DELETE FROM install_requests WHERE id = ?").bind(request.id).run(); return c.json({ error: "Install request expired" }, 410) }
  if (request.status === "pending") return c.json({ data: { status: "pending", expiresAt: request.expires_at } })
  const markdown = await getBundle({ db: c.env.DB, bucket: c.env.SKILL_BUNDLES, skillId: request.skill_id })
  if (!markdown) return c.json({ error: "Bundle not found" }, 404)
  await c.env.DB.prepare("DELETE FROM install_requests WHERE id = ?").bind(request.id).run()
  return c.json({ data: { status: "completed", skillId: request.skill_id, markdown } }, 200, { "cache-control": "no-store" })
})
app.post("/v1/install-requests/:id/complete", async (c) => {
  if (!c.env.SKILL_REGISTRY_ADDRESS || !c.env.BASE_SEPOLIA_RPC_URL) return c.json({ error: "Registry verification is not configured" }, 503)
  const request = await c.env.DB.prepare("SELECT id, skill_id, status, expires_at FROM install_requests WHERE id = ?").bind(c.req.param("id")).first<{ id: string; skill_id: string; status: "pending" | "completed"; expires_at: string }>()
  const payload = await c.req.json<{ buyer?: string }>().catch(() => ({}))
  if (!request || request.status !== "pending" || Date.parse(request.expires_at) <= Date.now() || !payload.buyer || !isWalletAddress(payload.buyer)) return c.json({ error: "Install request is invalid or expired" }, 400)
  const client = createPublicClient({ chain: baseSepolia, transport: http(c.env.BASE_SEPOLIA_RPC_URL) })
  const purchased = await client.readContract({ address: c.env.SKILL_REGISTRY_ADDRESS as `0x${string}`, abi: skillRegistryAbi, functionName: "hasPurchased", args: [keccak256(stringToHex(request.skill_id)), payload.buyer as `0x${string}`] })
  if (!purchased) return c.json({ error: "This wallet has not purchased the requested skill" }, 403)
  await c.env.DB.prepare("UPDATE install_requests SET status = 'completed', buyer_address = ? WHERE id = ?").bind(payload.buyer.toLowerCase(), request.id).run()
  return c.json({ data: { status: "completed", skillId: request.skill_id } })
})
app.post("/v1/install-requests/:namespace/:slug", async (c) => {
  const skillId = skillIdFromParams(c.req)
  if (!splitSkillId(skillId)) return c.json({ error: "Invalid skill ID" }, 400)
  if (!(await listings(c.env)).data.some((skill) => skill.id === skillId)) return c.json({ error: "Skill not found" }, 404)
  const id = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString()
  await c.env.DB.prepare("INSERT INTO install_requests (id, skill_id, expires_at) VALUES (?, ?, ?)").bind(id, skillId, expiresAt).run()
  return c.json({ data: { id, expiresAt } }, 201)
})
app.get("/v1/skills/:namespace/:slug/access/:buyer", async (c) => {
  if (!c.env.SKILL_REGISTRY_ADDRESS || !c.env.BASE_SEPOLIA_RPC_URL) return c.json({ error: "Registry verification is not configured" }, 503)
  const skillId = skillIdFromParams(c.req)
  const buyer = c.req.param("buyer")
  if (!splitSkillId(skillId) || !isWalletAddress(buyer)) return c.json({ error: "Invalid skill or wallet" }, 400)
  const client = createPublicClient({ chain: baseSepolia, transport: http(c.env.BASE_SEPOLIA_RPC_URL) })
  const purchased = await client.readContract({ address: c.env.SKILL_REGISTRY_ADDRESS as `0x${string}`, abi: skillRegistryAbi, functionName: "hasPurchased", args: [keccak256(stringToHex(skillId)), buyer as `0x${string}`] })
  return c.json({ data: { purchased } })
})
app.post("/v1/purchases/:namespace/:slug", async (c) => {
  const skillId = skillIdFromParams(c.req)
  if (!splitSkillId(skillId)) return c.json({ error: "Invalid skill ID" }, 400)
  if (!c.env.SKILL_REGISTRY_ADDRESS || !c.env.RECORDER_PRIVATE_KEY || !c.env.BASE_SEPOLIA_RPC_URL) return c.json({ error: "Checkout is not configured", code: "CHECKOUT_NOT_CONFIGURED" }, 503)
  const skill = (await listings(c.env)).data.find((item) => item.id === skillId)
  if (!skill) return c.json({ error: "Skill not found" }, 404)
  const payload = await c.req.json<{ buyer?: string; paymentTransactionHash?: string; installRequestId?: string }>().catch(() => ({}))
  if (!payload.buyer || !isWalletAddress(payload.buyer) || !payload.paymentTransactionHash || !/^0x[0-9a-fA-F]{64}$/.test(payload.paymentTransactionHash)) return c.json({ error: "A buyer address and USDC transaction hash are required" }, 400)
  if (payload.installRequestId) {
    const installRequest = await c.env.DB.prepare("SELECT skill_id, status, expires_at FROM install_requests WHERE id = ?").bind(payload.installRequestId).first<{ skill_id: string; status: string; expires_at: string }>()
    if (!installRequest || installRequest.skill_id !== skillId || installRequest.status !== "pending" || Date.parse(installRequest.expires_at) <= Date.now()) return c.json({ error: "Install request is invalid or expired" }, 400)
  }
  try {
    const client = createPublicClient({ chain: baseSepolia, transport: http(c.env.BASE_SEPOLIA_RPC_URL) })
    const [transaction, receipt] = await Promise.all([client.getTransaction({ hash: payload.paymentTransactionHash as `0x${string}` }), client.waitForTransactionReceipt({ hash: payload.paymentTransactionHash as `0x${string}`, confirmations: 1, timeout: 60_000 })])
    const usdcAddress = (c.env.USDC_ADDRESS ?? BASE_SEPOLIA_USDC).toLowerCase()
    if (receipt.status !== "success" || transaction.from.toLowerCase() !== payload.buyer.toLowerCase() || transaction.to?.toLowerCase() !== usdcAddress) return c.json({ error: "Payment transaction does not match this buyer" }, 400)
    const decoded = decodeFunctionData({ abi: usdcTransferAbi, data: transaction.input })
    const [recipient, amount] = decoded.args as readonly [`0x${string}`, bigint]
    const expectedAmount = parseUsdc(skill.priceUsdc)
    if (decoded.functionName !== "transfer" || recipient.toLowerCase() !== c.env.SKILL_REGISTRY_ADDRESS.toLowerCase() || amount !== expectedAmount) return c.json({ error: "Payment transaction does not match this skill price" }, 400)
    const alreadyRecorded = await client.readContract({ address: c.env.SKILL_REGISTRY_ADDRESS as `0x${string}`, abi: skillRegistryAbi, functionName: "processedPaymentTransactions", args: [payload.paymentTransactionHash as `0x${string}`] })
    if (!alreadyRecorded) await recordPurchase(c.env, { skillId, buyer: payload.buyer, amount: amount.toString(), paymentTransactionHash: payload.paymentTransactionHash })
    if (payload.installRequestId) {
      await c.env.DB.prepare("UPDATE install_requests SET status = 'completed', buyer_address = ?, payment_transaction_hash = ? WHERE id = ?").bind(payload.buyer.toLowerCase(), payload.paymentTransactionHash, payload.installRequestId).run()
    }
    return c.json({ data: { skillId, buyer: payload.buyer, paymentTransactionHash: payload.paymentTransactionHash } }, 201)
  } catch (error) {
    console.error("Browser checkout recording failed", error)
    return c.json({ error: `USDC was received, but its purchase receipt could not be recorded: ${safeErrorMessage(error)}`, code: "SETTLEMENT_RETRY_REQUIRED" }, 502)
  }
})
app.get("/v1/authors/:address/profile", async (c) => {
  const walletAddress = c.req.param("address").toLowerCase()
  if (!isWalletAddress(walletAddress)) return c.json({ error: "Invalid author address" }, 400)
  const profile = await c.env.DB.prepare("SELECT wallet_address, username, created_at FROM author_profiles WHERE wallet_address = ?").bind(walletAddress).first<{ wallet_address: string; username: string; created_at: string }>()
  return profile ? c.json({ data: { walletAddress: profile.wallet_address, username: profile.username, createdAt: profile.created_at } }) : c.json({ error: "Author username not found" }, 404)
})
app.get("/v1/usernames/:username", async (c) => {
  const username = c.req.param("username").trim().toLowerCase()
  if (!isUsername(username)) return c.json({ error: "Username must be 3–32 lowercase letters, numbers, or hyphens" }, 400)
  const profile = await c.env.DB.prepare("SELECT wallet_address FROM author_profiles WHERE username = ?").bind(username).first()
  return c.json({ data: { username, available: !profile } })
})
app.put("/v1/authors/:address/username", async (c) => {
  const walletAddress = c.req.param("address").toLowerCase()
  if (!isWalletAddress(walletAddress)) return c.json({ error: "Invalid author address" }, 400)
  const payload = await c.req.json<{ username?: string; issuedAt?: string; signature?: string }>().catch(() => ({}))
  const username = payload.username?.trim().toLowerCase() ?? ""
  if (!isUsername(username)) return c.json({ error: "Username must be 3–32 lowercase letters, numbers, or hyphens" }, 400)
  if (!payload.issuedAt || !payload.signature) return c.json({ error: "A signed embedded wallet authorization is required" }, 401)
  const issuedAt = Date.parse(payload.issuedAt)
  if (!Number.isFinite(issuedAt) || Math.abs(Date.now() - issuedAt) > 10 * 60 * 1_000) return c.json({ error: "Username authorization expired; sign again", code: "AUTHORIZATION_EXPIRED" }, 401)
  const message = createUsernameAuthorizationMessage({ walletAddress, username, issuedAt: payload.issuedAt })
  try {
    if (!await verifyMessage({ address: walletAddress as `0x${string}`, message, signature: payload.signature as `0x${string}` })) return c.json({ error: "Invalid username authorization" }, 401)
  } catch {
    return c.json({ error: "Invalid username authorization" }, 401)
  }
  const existing = await c.env.DB.prepare("SELECT username FROM author_profiles WHERE wallet_address = ?").bind(walletAddress).first<{ username: string }>()
  if (existing) return existing.username === username ? c.json({ data: { walletAddress, username } }) : c.json({ error: "Publisher username is permanent once claimed", code: "USERNAME_LOCKED" }, 409)
  try {
    await c.env.DB.prepare("INSERT INTO author_profiles (wallet_address, username) VALUES (?, ?)").bind(walletAddress, username).run()
  } catch {
    return c.json({ error: "That publisher username is already claimed", code: "USERNAME_TAKEN" }, 409)
  }
  return c.json({ data: { walletAddress, username } }, 201)
})
app.get("/v1/authors/:address", async (c) => {
  const address = c.req.param("address").toLowerCase()
  if (!isWalletAddress(address)) return c.json({ error: "Invalid author address" }, 400)
  const emptyDashboard = { totalSales: 0, grossRevenueUsdc: "0.00", sales: [], skills: [] }

  if (c.env.GRAPH_API_URL) {
    try {
      const response = await fetch(c.env.GRAPH_API_URL, {
        method: "POST",
        headers: { "content-type": "application/json", ...(c.env.GRAPH_API_KEY ? { authorization: `Bearer ${c.env.GRAPH_API_KEY}` } : {}) },
        body: JSON.stringify({
          query: "query AuthorDashboard($author: Bytes!) { author(id: $author) { totalSales grossRevenue skills { id metadataURI price majorVersion totalSales active } } purchases(first: 10, orderBy: timestamp, orderDirection: desc, where: { skill_: { author: $author } }) { id buyer amount timestamp transactionHash skill { metadataURI id } } }",
          variables: { author: address },
        }),
      })
      if (response.ok) {
        const payload = await response.json() as { data?: { author?: { totalSales: number; grossRevenue: string; skills: Array<{ id: string; metadataURI: string; price: string; majorVersion: number; totalSales: number; active: boolean }> }; purchases?: Array<{ id: string; buyer: string; amount: string; timestamp: string; transactionHash: string; skill: { metadataURI: string; id: string } }> }; errors?: Array<{ message: string }> }
        if (!payload.errors?.length) {
          const author = payload.data?.author
          if (!author) return c.json({ data: emptyDashboard, source: "graph" })
          const grossRevenue = Number(author.grossRevenue)
          return c.json({
            data: {
              totalSales: author.totalSales,
              grossRevenueUsdc: usdc(grossRevenue),
              sales: (payload.data?.purchases ?? []).map((purchase) => ({
                id: purchase.id,
                skill: purchase.skill.metadataURI.replace("skillsbay://", "") || purchase.skill.id,
                buyer: `${purchase.buyer.slice(0, 6)}…${purchase.buyer.slice(-4)}`,
                amount: usdc(purchase.amount),
                occurredAt: new Date(Number(purchase.timestamp) * 1_000).toLocaleString(),
                transactionHash: purchase.transactionHash,
              })),
              skills: author.skills.map((skill) => {
                const sourceId = skill.metadataURI.replace("skillsbay://", "") || skill.id
                const parsed = splitSkillId(sourceId)
                return {
                  id: skill.id,
                  namespace: parsed?.namespace ?? "onchain",
                  slug: parsed?.slug ?? skill.id.slice(2, 10),
                  title: parsed?.slug?.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ") ?? "Onchain skill",
                  priceUsdc: usdc(skill.price),
                  version: `${skill.majorVersion}.0.0`,
                  paidInstalls: skill.totalSales,
                  active: skill.active,
                }
              }),
            },
            source: "graph",
          })
        }
      }
    } catch (error) {
      console.error("Graph author query failed, checking local database", error)
    }
  }

  try {
    const authorSkills = await c.env.DB.prepare(
      "SELECT id, namespace, slug, title, price_usdc, version, paid_installs FROM skills WHERE LOWER(author_address) = ? ORDER BY paid_installs DESC"
    ).bind(address).all<{ id: string; namespace: string; slug: string; title: string; price_usdc: string; version: string; paid_installs: number }>()

    const salesResult = await c.env.DB.prepare(
      `SELECT s.id, sk.title as skill, s.buyer_address as buyer, s.amount_usdc as amount, s.occurred_at as occurredAt, s.transaction_hash as transactionHash
       FROM sales s
       JOIN skills sk ON s.skill_id = sk.id
       WHERE LOWER(sk.author_address) = ?
       ORDER BY s.occurred_at DESC LIMIT 10`
    ).bind(address).all<{ id: string; skill: string; buyer: string; amount: string; occurredAt: string; transactionHash: string }>()

    const skills = (authorSkills.results ?? []).map((s: { id: string; namespace: string; slug: string; title: string; price_usdc: string; version: string; paid_installs: number }) => ({
      id: s.id,
      namespace: s.namespace,
      slug: s.slug,
      title: s.title,
      priceUsdc: s.price_usdc,
      version: s.version,
      paidInstalls: s.paid_installs,
      active: true,
    }))

    const totalSales = skills.reduce((sum: number, s: { paidInstalls: number }) => sum + s.paidInstalls, 0)
    const grossRevenueRaw = skills.reduce((sum: number, s: { priceUsdc: string; paidInstalls: number }) => sum + (Number(s.priceUsdc) * s.paidInstalls * 0.95), 0)

    const sales = (salesResult.results ?? []).map((sale: { id: string; skill: string; buyer: string; amount: string; occurredAt: string; transactionHash: string }) => ({
      id: sale.id,
      skill: sale.skill,
      buyer: `${sale.buyer.slice(0, 6)}…${sale.buyer.slice(-4)}`,
      amount: sale.amount,
      occurredAt: sale.occurredAt,
      transactionHash: sale.transactionHash,
    }))

    return c.json({
      data: {
        totalSales,
        grossRevenueUsdc: grossRevenueRaw.toFixed(2),
        sales,
        skills,
      },
      source: "db",
    })
  } catch (error) {
    console.error("Local database author query failed", error)
    return c.json({ data: emptyDashboard, source: "unavailable" })
  }
})
app.get("/v1/install/:namespace/:slug/content", async (c) => {
  const skillId = skillIdFromParams(c.req)
  if (!splitSkillId(skillId)) return c.json({ error: "Invalid skill ID" }, 400)
  const skill = (await listings(c.env)).data.find((item) => item.id === skillId)
  if (!skill) return c.json({ error: "Skill not found" }, 404)
  if (!c.env.X402_RECIPIENT_ADDRESS || !c.env.SKILL_REGISTRY_ADDRESS || !c.env.RECORDER_PRIVATE_KEY || !c.env.BASE_SEPOLIA_RPC_URL) return c.json({ error: "x402 checkout is not configured", code: "X402_NOT_CONFIGURED" }, 503)
  if (c.env.X402_RECIPIENT_ADDRESS.toLowerCase() !== c.env.SKILL_REGISTRY_ADDRESS.toLowerCase()) return c.json({ error: "x402 recipient must be the SkillRegistry", code: "X402_RECIPIENT_MISMATCH" }, 503)
  const markdown = await getBundle({ db: c.env.DB, bucket: c.env.SKILL_BUNDLES, skillId })
  if (!markdown) return c.json({ error: "Bundle not found" }, 404)
  const resourceServer = new x402ResourceServer(new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" })).register("eip155:84532", new ExactEvmScheme())
  resourceServer.onAfterSettle(async ({ result, requirements }) => {
    if (!result.success || !result.payer || !result.amount) throw new Error("x402 settlement did not return a complete purchase receipt")
    await recordPurchase(c.env, { skillId, buyer: result.payer, amount: result.amount ?? requirements.amount, paymentTransactionHash: result.transaction })
  })
  const gate = paymentMiddleware(
    { "GET /v1/install/:namespace/:slug/content": { accepts: { scheme: "exact", network: "eip155:84532", price: `$${skill.priceUsdc}`, payTo: c.env.X402_RECIPIENT_ADDRESS } } },
    resourceServer,
    undefined,
    undefined,
    false,
  )
  await gate(c, async () => { c.res = c.text(markdown, 200, { "content-type": "text/markdown; charset=utf-8", "cache-control": "no-store" }) })
  return c.res
})
app.put("/v1/internal/bundles/:namespace/:slug", async (c) => {
  if (!isInternalPublisher(c.req.raw, c.env)) return c.json({ error: "Unauthorized" }, 401)
  const skillId = skillIdFromParams(c.req)
  if (!splitSkillId(skillId)) return c.json({ error: "Invalid skill ID" }, 400)
  const payload = await c.req.json<{ markdown?: string }>().catch(() => ({}))
  if (!payload.markdown?.startsWith("---")) return c.json({ error: "A single frontmatter-based SKILL.md bundle is required" }, 400)
  if (payload.markdown.length > 512_000) return c.json({ error: "SKILL.md must be 500 KB or smaller" }, 413)
  const stored = await putBundle({ db: c.env.DB, bucket: c.env.SKILL_BUNDLES, skillId, markdown: payload.markdown })
  return c.json({ data: { skillId, ...stored } }, 201)
})
app.post("/v1/publish/bundles/:namespace/:slug/read", async (c) => {
  const skillId = skillIdFromParams(c.req)
  if (!splitSkillId(skillId)) return c.json({ error: "Invalid skill ID" }, 400)
  const payload = await c.req.json<{ author?: string; issuedAt?: string; signature?: string }>().catch(() => ({}))
  if (!payload.author || !isWalletAddress(payload.author) || !payload.issuedAt || !payload.signature) return c.json({ error: "A signed author wallet is required" }, 401)
  const issuedAt = Date.parse(payload.issuedAt)
  if (!Number.isFinite(issuedAt) || Math.abs(Date.now() - issuedAt) > 10 * 60 * 1_000) return c.json({ error: "Bundle read authorization expired; sign again", code: "AUTHORIZATION_EXPIRED" }, 401)
  const author = payload.author.toLowerCase()
  const message = createBundleReadAuthorizationMessage({ skillId, author, issuedAt: payload.issuedAt })
  try {
    if (!await verifyMessage({ address: author as `0x${string}`, message, signature: payload.signature as `0x${string}` })) return c.json({ error: "Invalid author signature" }, 401)
    const chainAuthor = await registeredAuthor(c.env, skillId)
    if (!chainAuthor) return c.json({ error: "Skill registry verification is not configured" }, 503)
    if (chainAuthor.toLowerCase() !== author) return c.json({ error: "Only the on-chain skill author can read this bundle", code: "NOT_SKILL_AUTHOR" }, 403)
  } catch (error) {
    console.error("Skill bundle read authorization failed", error)
    return c.json({ error: "Could not verify the on-chain skill author" }, 503)
  }
  const markdown = await getBundle({ db: c.env.DB, bucket: c.env.SKILL_BUNDLES, skillId })
  return markdown ? c.json({ data: { markdown } }) : c.json({ error: "Bundle not found" }, 404)
})
app.post("/v1/publish/bundles/:namespace/:slug", async (c) => {
  const skillId = skillIdFromParams(c.req)
  if (!splitSkillId(skillId)) return c.json({ error: "Invalid skill ID" }, 400)
  const payload = await c.req.json<{ markdown?: string; author?: string; issuedAt?: string; signature?: string }>().catch(() => ({}))
  if (!payload.markdown?.startsWith("---")) return c.json({ error: "A single frontmatter-based SKILL.md bundle is required" }, 400)
  if (!payload.author || !/^0x[0-9a-fA-F]{40}$/.test(payload.author) || !payload.signature || !payload.issuedAt) return c.json({ error: "A signed author wallet is required" }, 401)
  const issuedAt = Date.parse(payload.issuedAt)
  if (!Number.isFinite(issuedAt) || Math.abs(Date.now() - issuedAt) > 10 * 60 * 1_000) return c.json({ error: "Publish authorization expired; sign again", code: "AUTHORIZATION_EXPIRED" }, 401)
  const contentSha256 = await sha256Hex(payload.markdown)
  const author = payload.author.toLowerCase()
  const message = createPublishAuthorizationMessage({ skillId, author, contentSha256, issuedAt: payload.issuedAt })
  let validSignature = false
  try {
    validSignature = await verifyMessage({ address: author as `0x${string}`, message, signature: payload.signature as `0x${string}` })
  } catch {
    return c.json({ error: "Invalid author signature" }, 401)
  }
  if (!validSignature) return c.json({ error: "Invalid author signature" }, 401)
  try {
    const chainAuthor = await registeredAuthor(c.env, skillId)
    if (!chainAuthor) return c.json({ error: "Skill registry verification is not configured" }, 503)
    if (chainAuthor.toLowerCase() !== author) return c.json({ error: "Register this skill from the signing wallet before uploading its bundle", code: "SKILL_NOT_REGISTERED" }, 409)
  } catch (error) {
    console.error("Skill registry author check failed", error)
    return c.json({ error: "Could not verify the on-chain skill author" }, 503)
  }
  try {
    await c.env.DB.prepare("INSERT INTO publish_authorizations (signature, skill_id, author_address, content_sha256, issued_at) VALUES (?, ?, ?, ?, ?)").bind(payload.signature, skillId, author, contentSha256, payload.issuedAt).run()
  } catch {
    return c.json({ error: "This publish authorization has already been used", code: "AUTHORIZATION_REPLAYED" }, 409)
  }
  const stored = await putBundle({ db: c.env.DB, bucket: c.env.SKILL_BUNDLES, skillId, markdown: payload.markdown })
  const split = splitSkillId(skillId)
  if (split) {
    const title = split.slug.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ")
    try {
      await c.env.DB.prepare(`
        INSERT INTO skills (id, namespace, slug, title, summary, category, price_usdc, paid_installs, trend, author, author_address, version, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      `).bind(skillId, split.namespace, split.slug, title, "A published skill on SkillsBay.", "Agent skill", "0.25", 0, 0, split.namespace, author, "1.0.0").run()
    } catch (error) {
      console.error("Failed to upsert skill to D1", error)
    }
  }
  return c.json({ data: { skillId, ...stored } }, 201)
})
app.get("/v1/internal/bundles/:namespace/:slug", async (c) => {
  if (!isInternalPublisher(c.req.raw, c.env)) return c.json({ error: "Unauthorized" }, 401)
  const markdown = await getBundle({ db: c.env.DB, bucket: c.env.SKILL_BUNDLES, skillId: skillIdFromParams(c.req) })
  return markdown ? c.text(markdown, 200, { "content-type": "text/markdown; charset=utf-8" }) : c.json({ error: "Bundle not found" }, 404)
})

export default app
