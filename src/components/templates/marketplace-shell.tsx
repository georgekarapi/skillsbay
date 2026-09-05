import type { ReactNode } from "react"
import { SiteHeader } from "@/components/organisms/site-header"
import { ModeToggle } from "@/components/molecules/mode-toggle"

export function MarketplaceShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-9 sm:px-6 sm:py-12">{children}</main>
      <footer className="border-t border-border/80 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-3">
            <span>skillsbay · paid skills for agents</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Base Sepolia · The Graph · Privy</span>
            <span className="hidden h-3 w-px bg-border sm:inline-block" aria-hidden="true" />
            <ModeToggle />
          </div>
        </div>
      </footer>
    </div>
  )
}

