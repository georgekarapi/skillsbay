import type { ReactNode } from "react"
import { SiteHeader } from "@/components/organisms/site-header"

export function MarketplaceShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen"><SiteHeader /><main className="mx-auto w-full max-w-6xl px-4 py-9 sm:px-6 sm:py-12">{children}</main><footer className="border-t py-6"><div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6"><span>skillsbay · paid skills for agents</span><span>Base Sepolia · The Graph · Privy</span></div></footer></div>
}
