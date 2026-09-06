import { Plus } from "lucide-react"
import { Link } from "react-router-dom"
import { AuthorOverview } from "@/components/organisms/author-overview"
import { ForAuthorsLanding } from "@/components/organisms/for-authors-landing"
import { Button } from "@/components/ui/button"
import { MarketplaceShell } from "@/components/templates/marketplace-shell"
import { useAuthorAuth } from "@/components/providers/author-auth-context"

export function DashboardPage() {
  const author = useAuthorAuth()

  if (author.configured && !author.ready) {
    return (
      <MarketplaceShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </MarketplaceShell>
    )
  }

  if (!author.authenticated) {
    return (
      <MarketplaceShell>
        <ForAuthorsLanding />
      </MarketplaceShell>
    )
  }

  const isLiveAccount = author.configured && author.authenticated
  const heading = isLiveAccount ? `Welcome back, ${author.displayName}.` : "Author dashboard"
  const description = author.walletAddress
    ? `${author.walletAddress.slice(0, 6)}…${author.walletAddress.slice(-4)} · Your wallet is ready.`
    : "Your embedded wallet is ready."

  return (
    <MarketplaceShell>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Author dashboard</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">{heading}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/skills/new">
            <Plus className="size-4" /> Publish skill
          </Link>
        </Button>
      </div>
      <AuthorOverview />
    </MarketplaceShell>
  )
}

