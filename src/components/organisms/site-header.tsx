import { Link, useLocation } from "react-router-dom"
import { Menu, Search } from "lucide-react"
import { BrandMark } from "@/components/atoms/brand-mark"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { AuthorAuthControl } from "@/components/molecules/author-auth-control"

export function SiteHeader() {
  const location = useLocation()
  const isDashboard = location.pathname.startsWith("/dashboard")
  return <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur"><div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6"><Link to="/" className="flex items-center gap-2 font-semibold tracking-tight"><BrandMark /><span>skillsbay</span></Link><nav className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex"><Link className="rounded-md px-2 py-1.5 hover:bg-muted hover:text-foreground" to="/">Discover</Link><Link className="rounded-md px-2 py-1.5 hover:bg-muted hover:text-foreground" to="/dashboard">For authors</Link></nav>{!isDashboard && <div className="hidden max-w-sm flex-1 md:block"><div className="relative"><Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" /><Input aria-label="Search skills" className="h-8 bg-muted/40 pl-8 text-xs" placeholder="Search skills..." /></div></div>}<div className="ml-auto hidden items-center gap-2 sm:flex"><AuthorAuthControl /></div><Sheet><SheetTrigger asChild><Button aria-label="Open navigation" className="ml-auto sm:hidden" size="icon-sm" variant="ghost"><Menu /></Button></SheetTrigger><SheetContent side="right"><div className="mt-8 grid gap-3"><Link to="/">Discover</Link><Link to="/dashboard">For authors</Link><Link to="/dashboard">Publish a skill</Link></div></SheetContent></Sheet></div></header>
}
