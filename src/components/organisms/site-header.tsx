import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Menu } from "lucide-react"
import { SkillsBayLogo } from "@/components/atoms/skillsbay-logo"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { AuthorAuthControl } from "@/components/molecules/author-auth-control"

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center text-foreground transition-opacity hover:opacity-90"
          aria-label="SkillsBay home"
        >
          <SkillsBayLogo className="h-8 w-auto" />
        </Link>

        {/* Right side: Nav items and Auth control */}
        <div className="hidden items-center gap-6 sm:flex">
          <nav className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
            <Link
              to="/"
              className={`rounded-md px-3 py-1.5 transition-colors ${
                location.pathname === "/"
                  ? "font-semibold text-foreground"
                  : "hover:bg-muted hover:text-foreground"
              }`}
            >
              Discover
            </Link>
            <Link
              to="/docs"
              className={`rounded-md px-3 py-1.5 transition-colors ${
                location.pathname.startsWith("/docs")
                  ? "font-semibold text-foreground"
                  : "hover:bg-muted hover:text-foreground"
              }`}
            >
              Docs
            </Link>
            <Link
              to="/dashboard"
              className={`rounded-md px-3 py-1.5 transition-colors ${
                location.pathname.startsWith("/dashboard")
                  ? "font-semibold text-foreground"
                  : "hover:bg-muted hover:text-foreground"
              }`}
            >
              For authors
            </Link>
          </nav>
          <div className="h-4 w-px bg-border" aria-hidden="true" />
          <AuthorAuthControl />
        </div>

        {/* Mobile menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button aria-label="Open navigation" className="sm:hidden" size="icon-sm" variant="ghost">
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex w-72 flex-col justify-between p-6">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <Link to="/" onClick={() => setOpen(false)} aria-label="SkillsBay home">
                  <SkillsBayLogo className="h-7 w-auto" />
                </Link>
              </div>

              <nav className="flex flex-col gap-1.5 text-sm">
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2 transition-colors ${
                    location.pathname === "/"
                      ? "bg-muted font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  Discover
                </Link>
                <Link
                  to="/docs"
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2 transition-colors ${
                    location.pathname.startsWith("/docs")
                      ? "bg-muted font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  Docs
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2 transition-colors ${
                    location.pathname === "/dashboard"
                      ? "bg-muted font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  For authors
                </Link>
                <Link
                  to="/dashboard/skills/new"
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2 transition-colors ${
                    location.pathname === "/dashboard/skills/new"
                      ? "bg-muted font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  Publish a skill
                </Link>
              </nav>
            </div>

            <div className="border-t border-border pt-4">
              <AuthorAuthControl />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
