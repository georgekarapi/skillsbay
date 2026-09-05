import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { MarketplaceShell } from "@/components/templates/marketplace-shell"

export function NotFoundPage() { return <MarketplaceShell><div className="py-24 text-center"><p className="font-mono text-sm text-muted-foreground">404</p><h1 className="mt-2 text-3xl font-semibold">Nothing anchored here.</h1><Button asChild className="mt-6"><Link to="/">Back to marketplace</Link></Button></div></MarketplaceShell> }
