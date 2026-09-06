import { Check, LayoutDashboard, LogIn, LogOut, Plus, Wallet } from "lucide-react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuthorAuth } from "@/components/providers/author-auth-context"
import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getAuthorDashboard } from "@/lib/marketplace-api"

export function AuthorAuthControl() {
  const author = useAuthorAuth()
  const accountSummary = useQuery({
    queryKey: ["header-author-dashboard", author.walletAddress],
    queryFn: () => getAuthorDashboard(author.walletAddress!),
    enabled: Boolean(author.authenticated && author.walletAddress),
  })

  if (!author.configured) return <Button asChild size="sm"><Link to="/dashboard">Get started</Link></Button>
  if (!author.ready) return <Button size="sm" disabled>Loading account</Button>
  if (!author.authenticated) return <Button size="sm" onClick={author.login}><LogIn /> Get started</Button>
  if (!author.walletAddress) return <Button size="sm" disabled><Wallet /> Creating wallet…</Button>

  const wallet = author.walletAddress
  const walletLabel = `${wallet.slice(0, 6)}…${wallet.slice(-4)}`
  const initial = author.displayName.trim().charAt(0).toUpperCase() || "A"
  const summary = accountSummary.data?.data
  const hasPublishedSkills = Boolean(summary?.skills && summary.skills.length > 0)

  const copyWallet = async () => {
    try {
      await navigator.clipboard.writeText(wallet)
      toast.success("Wallet address copied")
    } catch {
      toast.error("Could not copy wallet address")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="h-9 gap-2 px-2" size="sm" variant="outline">
          <Avatar size="sm">
            <AvatarFallback>{initial}</AvatarFallback>
            <AvatarBadge>
              <Check />
            </AvatarBadge>
          </Avatar>
          <span className="font-mono text-xs">{walletLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <div className="grid gap-0.5 py-1">
            <span className="truncate text-sm text-foreground">{author.displayName}</span>
            <button
              className="w-fit font-mono text-[11px] font-normal text-muted-foreground transition-colors hover:text-foreground"
              onClick={copyWallet}
              type="button"
            >
              {walletLabel}
            </button>
          </div>
        </DropdownMenuLabel>

        {accountSummary.isLoading ? (
          <div className="mx-1 mb-1.5 h-16 animate-pulse rounded-md border bg-muted/25" />
        ) : hasPublishedSkills ? (
          <div className="mx-1 mb-1 grid grid-cols-2 gap-3 rounded-md border bg-muted/35 p-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Payouts</p>
              <p className="mt-1 text-sm font-semibold text-foreground">${summary?.grossRevenueUsdc ?? "0.00"}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Installs</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{(summary?.totalSales ?? 0).toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <div className="mx-1 mb-1.5 rounded-lg border border-dashed border-border/80 bg-muted/25 p-3 text-center">
            <p className="text-xs font-medium text-foreground">No skills published yet</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Start earning USDC from AI agents
            </p>
            <DropdownMenuItem
              asChild
              className="mt-2.5 w-full cursor-pointer justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary/90 focus:bg-primary/90 focus:text-primary-foreground data-highlighted:bg-primary/90 data-highlighted:text-primary-foreground"
            >
              <Link to="/dashboard/skills/new" className="flex items-center justify-center gap-1.5">
                <Plus className="size-3.5" />
                Publish a skill
              </Link>
            </DropdownMenuItem>
          </div>
        )}

        <DropdownMenuItem asChild className="focus:bg-transparent focus:text-foreground">
          <Link to="/dashboard">
            <LayoutDashboard /> Author dashboard
          </Link>
        </DropdownMenuItem>

        {hasPublishedSkills && (
          <DropdownMenuItem asChild className="focus:bg-transparent focus:text-foreground">
            <Link to="/dashboard/skills/new">
              <Plus /> Publish a skill
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          className="text-destructive focus:bg-transparent focus:text-destructive [&_svg]:text-destructive"
          onSelect={author.logout}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
