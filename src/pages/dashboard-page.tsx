import { Plus } from "lucide-react"
import { Link } from "react-router-dom"
import { AuthorOverview } from "@/components/organisms/author-overview"
import { Button } from "@/components/ui/button"
import { MarketplaceShell } from "@/components/templates/marketplace-shell"
import { useAuthorAuth } from "@/components/providers/author-auth-context"

export function DashboardPage() {
  const author = useAuthorAuth()
  const isLiveAccount = author.configured && author.authenticated
  const heading = isLiveAccount ? `Welcome back, ${author.displayName}.` : "Author dashboard"
  const description = isLiveAccount
    ? `${author.walletAddress ? `${author.walletAddress.slice(0, 6)}…${author.walletAddress.slice(-4)} · ` : ""}Your Privy wallet is ready for Base Sepolia.`
    : author.configured ? "Connect your Privy account to publish skills and receive creator payouts directly to your wallet." : "Add VITE_PRIVY_APP_ID to enable author sign-in and embedded wallets."
  return <MarketplaceShell><div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Author dashboard</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">{heading}</h1><p className="mt-2 text-sm text-muted-foreground">{description}</p></div><Button asChild><Link to="/dashboard/skills/new"><Plus /> Publish skill</Link></Button></div><AuthorOverview /></MarketplaceShell>
}
