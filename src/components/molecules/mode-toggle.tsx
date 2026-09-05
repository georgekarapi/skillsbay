import { Monitor, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/providers/theme-provider"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className="relative size-8 rounded-md border-border/80 bg-background/60 hover:bg-muted"
          aria-label="Toggle theme"
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all text-foreground dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all text-foreground dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="flex cursor-pointer items-center gap-2"
        >
          <Sun className="size-4 text-muted-foreground" />
          <span>Light</span>
          {theme === "light" && <span className="ml-auto text-xs font-semibold text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="flex cursor-pointer items-center gap-2"
        >
          <Moon className="size-4 text-muted-foreground" />
          <span>Dark</span>
          {theme === "dark" && <span className="ml-auto text-xs font-semibold text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="flex cursor-pointer items-center gap-2"
        >
          <Monitor className="size-4 text-muted-foreground" />
          <span>System</span>
          {theme === "system" && <span className="ml-auto text-xs font-semibold text-primary">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
