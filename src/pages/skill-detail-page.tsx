import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react"
import { encodeFunctionData, parseAbi } from "viem"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { useAuthorAuth } from "@/components/providers/author-auth-context"
import { completeInstallRequest, getMarketplaceSkill, getPurchaseAccess, recordBrowserPurchase } from "@/lib/marketplace-api"
import type { Skill } from "@/types/marketplace"
import { CommandCopy } from "@/components/molecules/command-copy"
import { PriceBadge } from "@/components/molecules/price-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { MarketplaceShell } from "@/components/templates/marketplace-shell"

const usdcTransferAbi = parseAbi(["function transfer(address to, uint256 value) returns (bool)"])
const baseSepoliaUsdc = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"

function parseUsdc(value: string) {
  const [whole, fraction = ""] = value.split(".")
  return BigInt(whole) * 1_000_000n + BigInt((fraction + "000000").slice(0, 6))
}

export function SkillDetailPage() {
  const { username, skillSlug } = useParams()
  const skillQuery = useQuery({ queryKey: ["marketplace-skill", username, skillSlug], queryFn: () => getMarketplaceSkill(username!, skillSlug!), enabled: Boolean(username && skillSlug) })
  const skill = skillQuery.data
  return <MarketplaceShell>
    <Link className="mb-7 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" to="/"><ArrowLeft className="size-4" /> All skills</Link>
    {skillQuery.isLoading ? <div className="py-20 text-center text-sm text-muted-foreground">Loading skill from the live registry…</div> : skillQuery.isError ? <div className="py-20 text-center text-sm text-muted-foreground">The live skill registry could not be reached. Please try again.</div> : !skill ? <div className="py-20 text-center text-sm text-muted-foreground">This skill has not been registered or is no longer active.</div> : <SkillDetails skill={skill} />}
  </MarketplaceShell>
}

function SkillDetails({ skill }: { skill: Skill }) {
  const command = `npx skillsbay add ${skill.namespace}/${skill.slug}`
  return <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]"><article><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{skill.namespace}/{skill.slug}</span><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{skill.category}</span></div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{skill.title}</h1><p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{skill.summary}</p><div className="mt-6 flex flex-wrap gap-x-7 gap-y-3 text-sm"><span><b className="font-medium">{skill.paidInstalls.toLocaleString()}</b> <span className="text-muted-foreground">paid installs</span></span><span><b className="font-medium">v{skill.version}</b> <span className="text-muted-foreground">current version</span></span><span><b className="font-medium">{skill.updatedAt}</b> <span className="text-muted-foreground">status</span></span></div><Separator className="my-8" /><section><h2 className="text-lg font-semibold">Verified marketplace bundle</h2><div className="mt-3 grid gap-3 text-sm leading-6 text-muted-foreground"><p>This skill is registered on Base Sepolia. Its private R2 bundle is served only after a successful entitlement check.</p><p>After payment, the CLI writes the publisher’s `SKILL.md` into your local agent workspace.</p></div></section><section className="mt-8"><h2 className="text-lg font-semibold">Compatibility</h2><div className="mt-3 flex flex-wrap gap-2">{["Claude Code", "Codex", "Cursor", "OpenClaw"].map((agent) => <span key={agent} className="rounded-md border bg-muted/30 px-2.5 py-1 text-xs">{agent}</span>)}</div></section></article><aside className="space-y-4"><Card><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>Install this skill</CardTitle><CardDescription className="mt-1">Pay once. Keep compatible updates.</CardDescription></div><PriceBadge price={skill.priceUsdc} /></div></CardHeader><CardContent className="grid gap-4"><CommandCopy command={command} /><BrowserCheckout skill={skill} /><p className="text-center text-xs text-muted-foreground">x402 USDC · Base Sepolia</p></CardContent></Card><Card size="sm"><CardContent className="grid gap-3"><div className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-4 text-primary" /> Verified purchase access</div><p className="text-xs leading-5 text-muted-foreground">The Graph indexes registrations and purchase receipts for this bundle.</p></CardContent></Card><div className="rounded-lg border bg-muted/30 p-4 text-sm"><div className="flex items-center gap-2 font-medium"><CheckCircle2 className="size-4 text-emerald-600" /> Published by {skill.author}</div><p className="mt-2 break-all font-mono text-xs text-muted-foreground">{skill.authorAddress}</p></div></aside></div>
}

function BrowserCheckout({ skill }: { skill: Skill }) {
  const author = useAuthorAuth()
  const [params, setParams] = useSearchParams()
  const installRequestId = params.get("checkout")
  const [open, setOpen] = useState(Boolean(installRequestId))
  const [paying, setPaying] = useState(false)
  const registryAddress = import.meta.env.VITE_SKILL_REGISTRY_ADDRESS as string | undefined
  const pendingPaymentKey = `skillsbay:pending-payment:${skill.id}:${author.walletAddress ?? "wallet"}`
  const [pendingTransactionHash, setPendingTransactionHash] = useState<string | null>(() => sessionStorage.getItem(pendingPaymentKey))
  const purchaseAccess = useQuery({
    queryKey: ["purchase-access", skill.id, author.walletAddress],
    queryFn: () => getPurchaseAccess(skill.id, author.walletAddress!),
    enabled: Boolean(author.authenticated && author.walletAddress),
    staleTime: 15_000,
  })

  function setCheckoutOpen(next: boolean) {
    setOpen(next)
    if (!next && params.get("checkout") === "1") { const updated = new URLSearchParams(params); updated.delete("checkout"); setParams(updated, { replace: true }) }
  }

  async function confirmPayment(paymentTransactionHash: string) {
    await recordBrowserPurchase({ skillId: skill.id, buyer: author.walletAddress!, paymentTransactionHash, ...(installRequestId && installRequestId !== "1" ? { installRequestId } : {}) })
    sessionStorage.removeItem(pendingPaymentKey)
    setPendingTransactionHash(null)
    toast.success("Purchase confirmed", { description: "Your SkillsBay entitlement is now recorded." })
    setCheckoutOpen(false)
  }

  async function pay() {
    if (!author.authenticated) return author.login()
    if (!author.walletAddress || !author.sendTransaction || !author.signMessage || !registryAddress) return toast.error("Your Privy wallet is still being prepared.")
    setPaying(true)
    try {
      const alreadyPurchased = purchaseAccess.data ?? await getPurchaseAccess(skill.id, author.walletAddress)
      if (alreadyPurchased) {
        if (installRequestId && installRequestId !== "1") {
          await completeInstallRequest({ id: installRequestId, skillId: skill.id, buyer: author.walletAddress, signMessage: author.signMessage })
          toast.success("Installation unlocked", { description: "Return to the CLI; it will finish automatically." })
          setCheckoutOpen(false)
        } else {
          toast.success("Already purchased", { description: "This wallet already has access to this skill." })
        }
        return
      }
      if (pendingTransactionHash) {
        await confirmPayment(pendingTransactionHash)
        return
      }
      const data = encodeFunctionData({ abi: usdcTransferAbi, functionName: "transfer", args: [registryAddress as `0x${string}`, parseUsdc(skill.priceUsdc)] })
      const transaction = await author.sendTransaction({ to: baseSepoliaUsdc, data, chainId: 84532 })
      sessionStorage.setItem(pendingPaymentKey, transaction.hash)
      setPendingTransactionHash(transaction.hash)
      await confirmPayment(transaction.hash)
    } catch (error) {
      const paymentWasSubmitted = Boolean(sessionStorage.getItem(pendingPaymentKey))
      toast.error(paymentWasSubmitted ? "Payment sent; confirmation needs retry" : "Payment was not completed", { description: error instanceof Error ? error.message : "Please try again." })
    } finally { setPaying(false) }
  }

  const owned = purchaseAccess.data === true
  const label = paying ? "Confirming payment…" : pendingTransactionHash ? "Retry payment confirmation" : !author.authenticated ? "Connect Privy to pay" : !author.walletAddress ? "Creating Privy wallet…" : purchaseAccess.isLoading ? "Checking purchase access…" : owned && installRequestId && installRequestId !== "1" ? "Install owned skill" : owned ? "Already purchased" : `Pay $${skill.priceUsdc} with wallet`
  const description = owned
    ? installRequestId && installRequestId !== "1" ? "This Privy wallet already owns this skill. Continue to authorize the waiting CLI installation—no payment is needed." : "This Privy wallet already owns this skill. No additional payment is needed."
    : `Pay $${skill.priceUsdc} USDC from your Privy wallet on Base Sepolia. The payment is sent to SkillsBay and your access entitlement is recorded automatically.`
  return <Dialog open={open} onOpenChange={setCheckoutOpen}><DialogTrigger asChild><Button className="w-full">Pay with wallet</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{owned ? `Install ${skill.title}` : `Purchase ${skill.title}`}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><div className="grid gap-4 pt-2">{pendingTransactionHash ? <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">Your USDC transfer was submitted. Retrying below only records the purchase—it will not send another payment.</p> : null}<Button disabled={paying || purchaseAccess.isLoading || (author.authenticated && (!author.walletAddress || !author.sendTransaction || !author.signMessage || !registryAddress)) || (owned && (!installRequestId || installRequestId === "1"))} onClick={pay}>{label}</Button><p className="text-xs leading-5 text-muted-foreground">For an autonomous local installation, use the CLI with a funded agent wallet. This browser flow records purchase access for the connected Privy wallet.</p></div></DialogContent></Dialog>
}
