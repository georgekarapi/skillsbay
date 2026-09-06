import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Terminal,
  Wallet,
  Zap,
} from "lucide-react"
import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  http,
  parseAbi,
} from "viem"
import { baseSepolia } from "viem/chains"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { wrapFetchWithPayment, x402Client } from "@x402/fetch"
import { registerExactEvmScheme } from "@x402/evm/exact/client"
import { toClientEvmSigner } from "@x402/evm"
import { useAuthorAuth } from "@/components/providers/author-auth-context"
import {
  completeInstallRequest,
  endpoint,
  getMarketplaceSkill,
  getPurchaseAccess,
  recordBrowserPurchase,
  validateInstallRequest,
} from "@/lib/marketplace-api"
import type { Skill } from "@/types/marketplace"
import { CommandCopy } from "@/components/molecules/command-copy"
import { PriceBadge } from "@/components/molecules/price-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { MarketplaceShell } from "@/components/templates/marketplace-shell"
import { usePageSeo } from "@/hooks/use-page-seo"

const usdcTransferAbi = parseAbi(["function transfer(address to, uint256 value) returns (bool)"])
const usdcBalanceAbi = parseAbi(["function balanceOf(address account) view returns (uint256)"])
const baseSepoliaUsdc = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
const BASE_SEPOLIA_CHAIN_ID = 84532
const BASE_SEPOLIA_HEX = "0x14a34"

type Eip1193Provider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
  on?(event: string, handler: (...args: unknown[]) => void): void
  removeListener?(event: string, handler: (...args: unknown[]) => void): void
  providers?: Eip1193Provider[]
  isMetaMask?: boolean
  isRabby?: boolean
  isCoinbaseWallet?: boolean
}

type DiscoveredWallet = {
  id: string
  name: string
  provider: Eip1193Provider
}

declare global {
  interface Window {
    __SKILLSBAY_INITIAL_SKILL__?: Skill
    ethereum?: Eip1193Provider
  }
}

function parseUsdc(value: string) {
  const [whole, fraction = ""] = value.split(".")
  return BigInt(whole) * 1_000_000n + BigInt((fraction + "000000").slice(0, 6))
}

export function SkillDetailPage() {
  const { username, skillSlug } = useParams()
  const skillQuery = useQuery({
    queryKey: ["marketplace-skill", username, skillSlug],
    queryFn: () => getMarketplaceSkill(username!, skillSlug!),
    enabled: Boolean(username && skillSlug),
    // The Worker embeds the public listing in the HTML for this route. This
    // renders the detail page with real data on first paint, then React Query
    // keeps it fresh using the normal API request lifecycle.
    initialData: () => {
      if (typeof window === "undefined") return undefined
      const preloaded = window.__SKILLSBAY_INITIAL_SKILL__
      if (!preloaded || preloaded.namespace !== username || preloaded.slug !== skillSlug) return undefined
      return preloaded
    },
  })
  const skill = skillQuery.data

  usePageSeo({
    title: skill
      ? `${skill.title} by ${skill.author} (${skill.namespace}/${skill.slug}) – SkillsBay`
      : "Loading skill… – SkillsBay",
    description: skill ? skill.summary : "A verified agent skill on SkillsBay.",
    canonical: skill ? `/${skill.namespace}/${skill.slug}` : undefined,
    ogType: "article",
    ogImage: skill ? `/v1/skills/${skill.namespace}/${skill.slug}/og.png` : undefined,
    productPrice: skill ? skill.priceUsdc : undefined,
    jsonLd: skill
      ? {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: skill.title,
          description: skill.summary,
          applicationCategory: skill.category,
          operatingSystem: "AI Agent Workflows",
          offers: {
            "@type": "Offer",
            price: skill.priceUsdc,
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
          },
          author: {
            "@type": "Person",
            name: skill.author,
          },
          softwareVersion: skill.version,
        }
      : undefined,
  })

  return (
    <MarketplaceShell>
      <Link
        className="mb-7 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        to="/"
      >
        <ArrowLeft className="size-4" /> All skills
      </Link>
      {skillQuery.isLoading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          Loading skill from the live registry…
        </div>
      ) : skillQuery.isError ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          The live skill registry could not be reached. Please try again.
        </div>
      ) : !skill ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          This skill has not been registered or is no longer active.
        </div>
      ) : (
        <SkillDetails skill={skill} />
      )}
    </MarketplaceShell>
  )
}

function SkillDetails({ skill }: { skill: Skill }) {
  const command = `npx skillsbay add ${skill.namespace}/${skill.slug}`
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <article>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {skill.namespace}/{skill.slug}
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {skill.category}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{skill.title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{skill.summary}</p>
        <div className="mt-6 flex flex-wrap gap-x-7 gap-y-3 text-sm">
          <span>
            <b className="font-medium">{skill.paidInstalls.toLocaleString()}</b>{" "}
            <span className="text-muted-foreground">paid installs</span>
          </span>
          <span>
            <b className="font-medium">v{skill.version}</b>{" "}
            <span className="text-muted-foreground">current version</span>
          </span>
          <span>
            <b className="font-medium">{skill.updatedAt}</b>{" "}
            <span className="text-muted-foreground">status</span>
          </span>
        </div>
        <Separator className="my-8" />
        <section>
          <h2 className="text-lg font-semibold">Verified marketplace bundle</h2>
          <div className="mt-3 grid gap-3 text-sm leading-6 text-muted-foreground">
            <p>
              This skill is registered and verified. Its private bundle is served only after a successful
              entitlement check.
            </p>
            <p>
              After payment, the CLI writes the publisher’s `SKILL.md` into your local agent workspace.
            </p>
          </div>
        </section>
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Compatibility</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Claude Code", "Codex", "Cursor", "OpenClaw"].map((agent) => (
              <span key={agent} className="rounded-md border bg-muted/30 px-2.5 py-1 text-xs">
                {agent}
              </span>
            ))}
          </div>
        </section>
      </article>
      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Install this skill</CardTitle>
                <CardDescription className="mt-1">Pay once. Keep compatible updates.</CardDescription>
              </div>
              <PriceBadge price={skill.priceUsdc} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <CommandCopy command={command} />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-0.5">
              <Terminal className="size-3.5 shrink-0 text-primary" />
              <span>Run in terminal to install and trigger checkout</span>
            </div>
            <BrowserCheckout skill={skill} />
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="size-4 text-primary" /> Verified purchase access
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              The Graph indexes registrations and purchase receipts for this bundle.
            </p>
          </CardContent>
        </Card>
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="size-4 text-emerald-600" /> Published by {skill.author}
          </div>
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
            {skill.authorAddress}
          </p>
        </div>
      </aside>
    </div>
  )
}

function BrowserCheckout({ skill }: { skill: Skill }) {
  const author = useAuthorAuth()
  const [params, setParams] = useSearchParams()
  const installRequestId = params.get("checkout")
  const [open, setOpen] = useState(Boolean(installRequestId))
  const [resumePrivyCheckout, setResumePrivyCheckout] = useState(false)

  // Validate checkout token with backend / Cloudflare KV
  const tokenValidation = useQuery({
    queryKey: ["validate-checkout-token", installRequestId, skill.id],
    queryFn: () => validateInstallRequest(installRequestId!, skill.id),
    enabled: Boolean(installRequestId),
    staleTime: 5_000,
    retry: false,
  })

  const [currentTime, setCurrentTime] = useState(() => Date.now())

  useEffect(() => {
    if (!tokenValidation.data?.data?.expiresAt) return
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now())
    }, 1_000)
    return () => window.clearInterval(timer)
  }, [tokenValidation.data?.data?.expiresAt])

  const expiresTimestamp = tokenValidation.data?.data?.expiresAt
    ? Date.parse(tokenValidation.data.data.expiresAt)
    : null

  const secondsRemaining = expiresTimestamp
    ? Math.max(0, Math.floor((expiresTimestamp - currentTime) / 1_000))
    : null

  const isTokenExpired = Boolean(
    (tokenValidation.data && !tokenValidation.data.valid) ||
    tokenValidation.isError ||
    (secondsRemaining !== null && secondsRemaining <= 0)
  )

  // Selected checkout method: null shows stacked connect buttons, "x402" or "privy" shows active flow.
  // An existing Privy session already has an embedded wallet, so skip the
  // method chooser when the checkout is opened for an authenticated user.
  const [selectedMethod, setSelectedMethod] = useState<"x402" | "privy" | null>(() =>
    author.authenticated ? "privy" : null,
  )
  const previousAuthenticated = useRef(author.authenticated)

  useEffect(() => {
    const becameAuthenticated = !previousAuthenticated.current && author.authenticated
    previousAuthenticated.current = author.authenticated
    if (!becameAuthenticated || !open || resumePrivyCheckout || selectedMethod !== null) return
    setSelectedMethod("privy")
  }, [author.authenticated, open, resumePrivyCheckout, selectedMethod])

  // Browser wallet state
  const [discoveredWallets, setDiscoveredWallets] = useState<DiscoveredWallet[]>([])
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null)
  const [browserAddress, setBrowserAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [connectingBrowser, setConnectingBrowser] = useState(false)
  const [switchingNetwork, setSwitchingNetwork] = useState(false)
  const [payingX402, setPayingX402] = useState(false)
  const [x402Step, setX402Step] = useState<"idle" | "signing" | "settling" | "completed">("idle")
  const [downloadedMarkdown, setDownloadedMarkdown] = useState<string | null>(null)

  // Privy checkout state
  const [payingPrivy, setPayingPrivy] = useState(false)
  const registryAddress = import.meta.env.VITE_SKILL_REGISTRY_ADDRESS as string | undefined
  const pendingPaymentKey = `skillsbay:pending-payment:${skill.id}:${author.walletAddress ?? "wallet"}`
  const [pendingTransactionHash, setPendingTransactionHash] = useState<string | null>(() =>
    sessionStorage.getItem(pendingPaymentKey)
  )

  const availableBrowserWallets = (() => {
    const wallets = [...discoveredWallets]
    const legacyProvider = typeof window === "undefined" ? undefined : window.ethereum
    const legacyProviders = legacyProvider?.providers?.length ? legacyProvider.providers : legacyProvider ? [legacyProvider] : []
    for (const [index, provider] of legacyProviders.entries()) {
      if (wallets.some((wallet) => wallet.provider === provider)) continue
      const name = provider.isRabby
        ? "Rabby"
        : provider.isCoinbaseWallet
          ? "Coinbase Wallet"
          : provider.isMetaMask
            ? "MetaMask"
            : "Browser wallet"
      wallets.push({ id: `legacy-${index}`, name, provider })
    }
    return wallets
  })()
  const selectedWallet = selectedWalletId
    ? availableBrowserWallets.find((wallet) => wallet.id === selectedWalletId)
    : availableBrowserWallets.length === 1
      ? availableBrowserWallets[0]
      : undefined
  const browserProvider = selectedWallet?.provider
  const hasInjectedProvider = availableBrowserWallets.length > 0

  // Radix Dialog makes outside content inert while it is open. Privy's login
  // portal lives outside this checkout dialog, so close the checkout first or
  // the visible Privy modal cannot receive pointer/focus events.
  function startPrivyLogin() {
    setSelectedMethod("privy")
    setResumePrivyCheckout(true)
    setOpen(false)
    window.setTimeout(() => author.login(), 0)
  }

  useEffect(() => {
    if (!resumePrivyCheckout || !author.authenticated) return
    const timer = window.setTimeout(() => {
      setOpen(true)
      setSelectedMethod("privy")
      setResumePrivyCheckout(false)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [author.authenticated, resumePrivyCheckout])

  // EIP-6963 avoids the ambiguous window.ethereum proxy created when multiple
  // wallet extensions are installed. Keep the announced providers so a buyer
  // can explicitly choose which extension should receive the request.
  useEffect(() => {
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<{ info?: { uuid?: string; name?: string }; provider?: Eip1193Provider }>).detail
      if (!detail?.info?.uuid || !detail.provider) return
      const id = detail.info.uuid
      const name = detail.info.name || "Browser wallet"
      const provider = detail.provider
      setDiscoveredWallets((wallets) =>
        wallets.some((wallet) => wallet.id === id)
          ? wallets
          : [...wallets, { id, name, provider }]
      )
    }

    window.addEventListener("eip6963:announceProvider", onAnnounce)
    window.dispatchEvent(new Event("eip6963:requestProvider"))
    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce)
  }, [])

  // Detect and listen to injected wallet changes
  useEffect(() => {
    if (!browserProvider) return
    const eth = browserProvider

    const handleAccounts = (accounts: unknown) => {
      const accList = accounts as string[]
      setBrowserAddress(accList && accList.length > 0 ? accList[0] : null)
    }

    const handleChain = (chainHex: unknown) => {
      const parsed = parseInt(String(chainHex), 16)
      setChainId(Number.isFinite(parsed) ? parsed : null)
    }

    eth.on?.("accountsChanged", handleAccounts)
    eth.on?.("chainChanged", handleChain)

    eth
      .request({ method: "eth_accounts" })
      .then((accs) => {
        const list = accs as string[]
        if (list && list.length > 0) setBrowserAddress(list[0])
      })
      .catch(() => {})

    eth
      .request({ method: "eth_chainId" })
      .then((hex) => {
        const parsed = parseInt(String(hex), 16)
        if (Number.isFinite(parsed)) setChainId(parsed)
      })
      .catch(() => {})

    return () => {
      eth.removeListener?.("accountsChanged", handleAccounts)
      eth.removeListener?.("chainChanged", handleChain)
    }
  }, [browserProvider])

  // Browser wallet USDC balance
  const browserUsdcQuery = useQuery({
    queryKey: ["browser-usdc-balance", browserAddress, chainId],
    queryFn: async () => {
      if (!browserAddress || chainId !== BASE_SEPOLIA_CHAIN_ID) return null
      const client = createPublicClient({
        chain: baseSepolia,
        transport: http(import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"),
      })
      const bal = await client.readContract({
        address: baseSepoliaUsdc as `0x${string}`,
        abi: usdcBalanceAbi,
        functionName: "balanceOf",
        args: [browserAddress as `0x${string}`],
      })
      return (Number(bal) / 1_000_000).toFixed(2)
    },
    enabled: Boolean(browserAddress && chainId === BASE_SEPOLIA_CHAIN_ID),
    staleTime: 10_000,
  })

  // Purchase access queries
  const browserPurchaseAccess = useQuery({
    queryKey: ["purchase-access", skill.id, browserAddress],
    queryFn: () => getPurchaseAccess(skill.id, browserAddress!),
    enabled: Boolean(browserAddress),
    staleTime: 15_000,
  })

  const privyPurchaseAccess = useQuery({
    queryKey: ["purchase-access", skill.id, author.walletAddress],
    queryFn: () => getPurchaseAccess(skill.id, author.walletAddress!),
    enabled: Boolean(author.authenticated && author.walletAddress),
    staleTime: 15_000,
  })

  function setCheckoutOpen(next: boolean) {
    setOpen(next)
    if (next && author.authenticated) {
      setSelectedMethod("privy")
    }
    if (!next) {
      if (params.has("checkout")) {
        const updated = new URLSearchParams(params)
        updated.delete("checkout")
        setParams(updated, { replace: true })
      }
      setX402Step("idle")
      setSelectedMethod(null)
    }
  }

  async function connectBrowserWallet(provider = browserProvider) {
    if (!provider) {
      toast.error("No browser wallet extension detected.", {
        description: "Please install MetaMask, Rabby, or Coinbase Wallet, or use Privy.",
      })
      return
    }
    setConnectingBrowser(true)
    try {
      const eth = provider
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[]
      if (accounts.length > 0) {
        setBrowserAddress(accounts[0])
        const chainHex = (await eth.request({ method: "eth_chainId" })) as string
        setChainId(parseInt(chainHex, 16))
        toast.success("Browser wallet connected", {
          description: `${accounts[0].slice(0, 6)}…${accounts[0].slice(-4)}`,
        })
      }
    } catch (err) {
      toast.error("Could not connect wallet", {
        description: err instanceof Error ? err.message : "Request was rejected.",
      })
    } finally {
      setConnectingBrowser(false)
    }
  }

  async function switchToBaseSepolia() {
    if (!browserProvider) return
    setSwitchingNetwork(true)
    try {
      const eth = browserProvider
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_SEPOLIA_HEX }],
      })
      setChainId(BASE_SEPOLIA_CHAIN_ID)
      toast.success("Switched to Base Sepolia")
    } catch (switchError: unknown) {
      const err = switchError as { code?: number; message?: string }
      if (err?.code === 4902 || String(err?.message).includes("Unrecognized chain")) {
        try {
          const eth = browserProvider
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: BASE_SEPOLIA_HEX,
                chainName: "Base Sepolia",
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://sepolia.base.org"],
                blockExplorerUrls: ["https://sepolia.basescan.org"],
              },
            ],
          })
          setChainId(BASE_SEPOLIA_CHAIN_ID)
          toast.success("Base Sepolia added and switched")
        } catch (addError) {
          toast.error("Could not add Base Sepolia network", {
            description: addError instanceof Error ? addError.message : String(addError),
          })
        }
      } else {
        toast.error("Could not switch network", {
          description: err?.message || "Please switch to Base Sepolia in your wallet.",
        })
      }
    } finally {
      setSwitchingNetwork(false)
    }
  }

  async function unlockCliWithBrowserWallet() {
    if (!browserAddress || !browserProvider || !installRequestId || installRequestId === "1") return
    try {
      const eth = browserProvider
      const walletClient = createWalletClient({ chain: baseSepolia, transport: custom(eth) })
      await completeInstallRequest({
        id: installRequestId,
        skillId: skill.id,
        buyer: browserAddress,
        signMessage: async (msg) =>
          walletClient.signMessage({ account: browserAddress as `0x${string}`, message: msg }),
      })
      toast.success("Installation unlocked", {
        description: "Return to your terminal; the CLI will finish installing automatically.",
      })
      setCheckoutOpen(false)
    } catch (err) {
      toast.error("Could not unlock installation", {
        description: err instanceof Error ? err.message : "Failed to sign authorization.",
      })
    }
  }

  async function payWithX402() {
    if (!browserProvider) {
      return connectBrowserWallet()
    }
    if (!browserAddress) {
      return connectBrowserWallet()
    }
    if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
      return switchToBaseSepolia()
    }

    const alreadyPurchased =
      browserPurchaseAccess.data ?? (await getPurchaseAccess(skill.id, browserAddress))
    if (alreadyPurchased) {
      if (installRequestId && installRequestId !== "1") {
        return unlockCliWithBrowserWallet()
      }
      toast.success("Already purchased", {
        description: "This browser wallet already owns this skill.",
      })
      return
    }

    setPayingX402(true)
    setX402Step("signing")
    try {
      const eth = browserProvider
      const walletClient = createWalletClient({ chain: baseSepolia, transport: custom(eth) })
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"),
      })

      const signer = toClientEvmSigner(
        {
          address: browserAddress as `0x${string}`,
          signTypedData: async (msg) => {
            setX402Step("signing")
            return walletClient.signTypedData({
              account: browserAddress as `0x${string}`,
              domain: msg.domain as Parameters<typeof walletClient.signTypedData>[0]["domain"],
              types: msg.types as Parameters<typeof walletClient.signTypedData>[0]["types"],
              primaryType: msg.primaryType as string,
              message: msg.message as Record<string, unknown>,
            })
          },
        },
        publicClient
      )

      const client = new x402Client()
      registerExactEvmScheme(client, {
        signer,
        networks: ["eip155:84532"],
      })

      setX402Step("settling")
      const paymentFetch = wrapFetchWithPayment(fetch, client)
      const queryParam = installRequestId
        ? `?installRequestId=${encodeURIComponent(installRequestId)}`
        : ""
      const url = endpoint(`/v1/install/${skill.namespace}/${skill.slug}/content${queryParam}`)

      const response = await paymentFetch(url)
      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || `Payment failed (${response.status})`)
      }

      const bundleMarkdown = await response.text()
      setDownloadedMarkdown(bundleMarkdown)
      setX402Step("completed")

      browserPurchaseAccess.refetch()

      if (installRequestId && installRequestId !== "1") {
        toast.success("Installation unlocked!", {
          description: "Payment confirmed on-chain. Return to your terminal to complete.",
        })
      } else {
        toast.success("Purchase successful!", {
          description: "USDC settled via x402 and access recorded on Base Sepolia.",
        })
      }
    } catch (err: unknown) {
      console.error("x402 payment error", err)
      toast.error("Payment was not completed", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
      setX402Step("idle")
    } finally {
      setPayingX402(false)
    }
  }

  // Privy payment flow
  async function confirmPrivyPayment(paymentTransactionHash: string) {
    await recordBrowserPurchase({
      skillId: skill.id,
      buyer: author.walletAddress!,
      paymentTransactionHash,
      ...(installRequestId && installRequestId !== "1" ? { installRequestId } : {}),
    })
    sessionStorage.removeItem(pendingPaymentKey)
    setPendingTransactionHash(null)
    toast.success("Purchase confirmed", {
      description: "Your SkillsBay entitlement is now recorded.",
    })
    setCheckoutOpen(false)
  }

  async function payWithPrivy() {
    if (!author.authenticated) return startPrivyLogin()
    if (
      !author.walletAddress ||
      !author.sendTransaction ||
      !author.signMessage ||
      !registryAddress
    ) {
      return toast.error("Your Privy wallet is still being prepared.")
    }
    setPayingPrivy(true)
    try {
      const alreadyPurchased =
        privyPurchaseAccess.data ?? (await getPurchaseAccess(skill.id, author.walletAddress))
      if (alreadyPurchased) {
        if (installRequestId && installRequestId !== "1") {
          await completeInstallRequest({
            id: installRequestId,
            skillId: skill.id,
            buyer: author.walletAddress,
            signMessage: author.signMessage,
          })
          toast.success("Installation unlocked", {
            description: "Return to the CLI; it will finish automatically.",
          })
          setCheckoutOpen(false)
        } else {
          toast.success("Already purchased", {
            description: "This wallet already has access to this skill.",
          })
        }
        return
      }
      if (pendingTransactionHash) {
        await confirmPrivyPayment(pendingTransactionHash)
        return
      }
      const data = encodeFunctionData({
        abi: usdcTransferAbi,
        functionName: "transfer",
        args: [registryAddress as `0x${string}`, parseUsdc(skill.priceUsdc)],
      })
      const transaction = await author.sendTransaction({
        to: baseSepoliaUsdc,
        data,
        chainId: 84532,
      })
      sessionStorage.setItem(pendingPaymentKey, transaction.hash)
      setPendingTransactionHash(transaction.hash)
      await confirmPrivyPayment(transaction.hash)
    } catch (error) {
      const paymentWasSubmitted = Boolean(sessionStorage.getItem(pendingPaymentKey))
      toast.error(
        paymentWasSubmitted
          ? "Payment sent; confirmation needs retry"
          : "Payment was not completed",
        { description: error instanceof Error ? error.message : "Please try again." }
      )
    } finally {
      setPayingPrivy(false)
    }
  }

  // Derived state for browser wallet
  const browserOwned = browserPurchaseAccess.data === true
  const isWrongChain = Boolean(browserAddress && chainId !== BASE_SEPOLIA_CHAIN_ID)
  const balanceVal = browserUsdcQuery.data ? parseFloat(browserUsdcQuery.data) : null
  const priceVal = parseFloat(skill.priceUsdc)
  const isInsufficientBalance = Boolean(balanceVal !== null && balanceVal < priceVal)

  // Derived state for Privy
  const privyOwned = privyPurchaseAccess.data === true

  if (!installRequestId) return null

  return (
    <Dialog open={open} onOpenChange={setCheckoutOpen}>
      <DialogContent className="sm:max-w-115">
        {tokenValidation.isLoading ? (
          <>
            <DialogHeader>
              <DialogTitle>Verifying checkout session…</DialogTitle>
              <DialogDescription>Checking session token with SkillsBay</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Validating token…</p>
            </div>
          </>
        ) : isTokenExpired ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 text-destructive font-semibold">
                <AlertCircle className="size-5 shrink-0" />
                <span>Checkout session expired</span>
              </div>
              <DialogDescription className="mt-1">
                {tokenValidation.data?.error || "This checkout session has expired or is invalid. Sessions are valid for 15 minutes."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border bg-muted/40 p-3.5 text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">How to start a new checkout:</p>
                <p>Re-run the installation command in your terminal to generate a fresh checkout session:</p>
                <div className="font-mono bg-background p-2 rounded border text-foreground text-[11px] select-all">
                  npx skillsbay add {skill.id}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setCheckoutOpen(false)}
                >
                  Dismiss
                </Button>
                <Button
                  className="w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(`npx skillsbay add ${skill.id}`)
                    toast.success("Command copied to clipboard")
                    setCheckoutOpen(false)
                  }}
                >
                  <Copy className="size-3.5 mr-1.5" />
                  Copy command & close
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between gap-2">
                <DialogTitle>
                  {browserOwned || privyOwned
                    ? `Install ${skill.title}`
                    : `Purchase ${skill.title}`}
                </DialogTitle>
                {secondsRemaining !== null && secondsRemaining > 0 ? (
                  <span className="flex items-center gap-1 font-mono text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 shrink-0">
                    <Clock className="size-3" />
                    {Math.floor(secondsRemaining / 60)}:{(secondsRemaining % 60).toString().padStart(2, "0")}
                  </span>
                ) : null}
              </div>
              <DialogDescription>
                ${skill.priceUsdc} USDC · Verified AI agent bundle
              </DialogDescription>
            </DialogHeader>

        {selectedMethod === null ? (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Select how you would like to connect and pay:
            </p>

            {/* Stacked Button 1: Browser Wallet (x402) */}
            <button
              type="button"
              disabled={connectingBrowser}
              onClick={async () => {
                setSelectedMethod("x402")
                if (availableBrowserWallets.length === 1 && !browserAddress) {
                  await connectBrowserWallet()
                }
              }}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-border/70 bg-card/60 hover:bg-muted/30 hover:border-primary/50 transition-all text-left group cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-3.5">
                <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform shrink-0">
                  <Wallet className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-medium text-sm">
                    <span>{browserAddress ? "Browser Wallet" : "Connect Browser Wallet"}</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary font-normal"
                    >
                      x402
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {browserAddress
                      ? `${browserAddress.slice(0, 6)}…${browserAddress.slice(-4)} · Ready to pay`
                      : "MetaMask, Rabby, Coinbase · Gasless USDC"}
                  </p>
                </div>
              </div>
              <div className="flex items-center text-muted-foreground group-hover:text-foreground transition-colors pl-2">
                {connectingBrowser ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  <ChevronRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                )}
              </div>
            </button>

            {/* Stacked Button 2: Privy Account */}
            <button
              type="button"
              onClick={() => {
                if (!author.authenticated) return startPrivyLogin()
                setSelectedMethod("privy")
              }}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-border/70 bg-card/60 hover:bg-muted/30 hover:border-primary/50 transition-all text-left group cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-3.5">
                <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform shrink-0">
                  <Zap className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-medium text-sm">
                    <span>{author.authenticated ? "Privy Account" : "Connect Privy Account"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {author.authenticated && author.walletAddress
                      ? `${author.walletAddress.slice(0, 6)}…${author.walletAddress.slice(-4)} · Ready to pay`
                      : "Email, Google, Twitter, or embedded wallet"}
                  </p>
                </div>
              </div>
              <div className="flex items-center text-muted-foreground group-hover:text-foreground transition-colors pl-2">
                <ChevronRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        ) : selectedMethod === "x402" ? (
          <div className="pt-2 space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedMethod(null)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Change method</span>
              </button>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary font-normal"
              >
                Browser Wallet (x402)
              </Badge>
            </div>

            {x402Step === "completed" ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-center space-y-3">
                <div className="flex justify-center">
                  <CheckCircle2 className="size-8 text-emerald-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Payment Confirmed!</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your entitlement has been recorded on Base Sepolia.
                  </p>
                </div>
                {installRequestId && installRequestId !== "1" ? (
                  <p className="rounded-md bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    Return to your terminal; the waiting CLI is now installing the skill!
                  </p>
                ) : null}
                <div className="flex justify-center gap-2 pt-1">
                  {downloadedMarkdown ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(downloadedMarkdown)
                        toast.success("SKILL.md copied to clipboard")
                      }}
                    >
                      <Copy className="size-3.5 mr-1" /> Copy Bundle
                    </Button>
                  ) : null}
                  <Button size="sm" onClick={() => setCheckoutOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            ) : !hasInjectedProvider ? (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-relaxed text-muted-foreground space-y-3">
                <div className="font-semibold text-foreground flex items-center gap-2">
                  <Wallet className="size-4 text-amber-500" />
                  No browser wallet extension detected
                </div>
                <p>
                  To pay with a browser wallet, install MetaMask, Rabby, or Coinbase Wallet.
                  Alternatively, sign in with your email or social account using Privy.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" asChild>
                    <a
                      href="https://metamask.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1"
                    >
                      Get MetaMask <ExternalLink className="size-3" />
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!author.authenticated) return startPrivyLogin()
                      setSelectedMethod("privy")
                    }}
                  >
                    Sign in with Privy instead
                  </Button>
                </div>
              </div>
            ) : !browserAddress ? (
              <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 text-primary shrink-0">
                    <Wallet className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Connect your browser wallet</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pay with USDC on Base Sepolia using standard HTTP 402 gasless payments.
                    </p>
                  </div>
                </div>
                {availableBrowserWallets.length > 1 ? (
                  <div className="grid gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Choose a wallet extension</p>
                    {availableBrowserWallets.map((wallet) => (
                      <Button
                        key={wallet.id}
                        variant="outline"
                        className="w-full justify-between"
                        disabled={connectingBrowser}
                        onClick={() => {
                          setSelectedWalletId(wallet.id)
                          void connectBrowserWallet(wallet.provider)
                        }}
                      >
                        {wallet.name}
                        {connectingBrowser && selectedWalletId === wallet.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <Button
                    onClick={() => void connectBrowserWallet()}
                    disabled={connectingBrowser}
                    className="w-full"
                  >
                    {connectingBrowser ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" /> Connecting…
                      </>
                    ) : (
                      "Connect Browser Wallet"
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Connected wallet banner */}
                <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-mono">
                      {browserAddress.slice(0, 6)}…{browserAddress.slice(-4)}
                    </span>
                  </div>
                  <div>
                    {isWrongChain ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-6 text-[11px] px-2"
                        onClick={switchToBaseSepolia}
                        disabled={switchingNetwork}
                      >
                        {switchingNetwork ? "Switching…" : "Switch to Base Sepolia"}
                      </Button>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-[10px] text-emerald-600 bg-emerald-500/10 font-normal"
                      >
                        Base Sepolia
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Balance & Price breakdown */}
                <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
                  <span>
                    USDC Balance:{" "}
                    <b className="font-mono text-foreground">
                      {browserUsdcQuery.isLoading
                        ? "…"
                        : `$${browserUsdcQuery.data ?? "0.00"} USDC`}
                    </b>
                  </span>
                  <span>
                    Price: <b className="font-mono text-primary">${skill.priceUsdc} USDC</b>
                  </span>
                </div>

                {/* x402 explanation badge */}
                <div className="rounded-md border bg-muted/30 p-2.5 text-[11px] leading-relaxed text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                  <span>
                    Gasless HTTP 402 payment: Sign a USDC permit in your wallet. Settlement is
                    handled automatically on Base Sepolia.
                  </span>
                </div>

                {/* Action button */}
                {isWrongChain ? (
                  <Button
                    onClick={switchToBaseSepolia}
                    disabled={switchingNetwork}
                    className="w-full"
                  >
                    {switchingNetwork ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" /> Switching Network…
                      </>
                    ) : (
                      "Switch to Base Sepolia to Pay"
                    )}
                  </Button>
                ) : browserOwned && installRequestId && installRequestId !== "1" ? (
                  <Button onClick={unlockCliWithBrowserWallet} className="w-full">
                    Authorize Waiting CLI Installation
                  </Button>
                ) : browserOwned ? (
                  <Button disabled className="w-full">
                    Already Purchased by this Wallet
                  </Button>
                ) : isInsufficientBalance ? (
                  <Button disabled className="w-full">
                    Insufficient USDC Balance (${browserUsdcQuery.data ?? "0.00"})
                  </Button>
                ) : (
                  <Button
                    disabled={payingX402}
                    onClick={payWithX402}
                    className="w-full"
                  >
                    {payingX402 ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" />
                        {x402Step === "signing"
                          ? "Sign in your wallet…"
                          : "Settling payment via x402…"}
                      </>
                    ) : (
                      `Pay $${skill.priceUsdc} with Browser Wallet (x402)`
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="pt-2 space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedMethod(null)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Change method</span>
              </button>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                Privy Account
              </Badge>
            </div>

            <div className="space-y-3">
              {author.authenticated && author.walletAddress ? (
                <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Zap className="size-3.5 text-primary" />
                    <span className="font-mono">
                      {author.walletAddress.slice(0, 6)}…{author.walletAddress.slice(-4)}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Privy Embedded
                  </Badge>
                </div>
              ) : null}

              {pendingTransactionHash ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                  Your USDC transfer was submitted. Retrying below only records the purchase—it
                  will not send another payment.
                </p>
              ) : null}

              <Button
                disabled={
                  payingPrivy ||
                  privyPurchaseAccess.isLoading ||
                  (author.authenticated &&
                    (!author.walletAddress ||
                      !author.sendTransaction ||
                      !author.signMessage ||
                      !registryAddress)) ||
                  (privyOwned && (!installRequestId || installRequestId === "1"))
                }
                onClick={payWithPrivy}
                className="w-full"
              >
                {payingPrivy
                  ? "Confirming payment…"
                  : pendingTransactionHash
                  ? "Retry payment confirmation"
                  : !author.authenticated
                  ? "Connect Privy to pay"
                  : !author.walletAddress
                  ? "Creating Privy wallet…"
                  : privyPurchaseAccess.isLoading
                  ? "Checking purchase access…"
                  : privyOwned && installRequestId && installRequestId !== "1"
                  ? "Install owned skill"
                  : privyOwned
                  ? "Already purchased"
                  : `Pay $${skill.priceUsdc} with Privy wallet`}
              </Button>

              <p className="text-xs leading-5 text-muted-foreground text-center">
                Embedded wallet with gas sponsorship. Access is tied to your Privy account.
              </p>
            </div>
          </div>
        )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
