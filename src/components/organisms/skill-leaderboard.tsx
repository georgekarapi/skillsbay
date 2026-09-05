import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { getMarketplaceSkills } from "@/lib/marketplace-api"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { SkillRow } from "@/components/organisms/skill-row"

export type SkillTab = "trending" | "top" | "new"

export interface SkillLeaderboardProps {
  tab?: SkillTab
  onTabChange?: (tab: SkillTab) => void
}

export function SkillLeaderboard({ tab: controlledTab, onTabChange }: SkillLeaderboardProps = {}) {
  const [query, setQuery] = useState("")
  const [internalTab, setInternalTab] = useState<SkillTab>("trending")
  const tab = controlledTab ?? internalTab
  const handleTabChange = (newTab: SkillTab) => {
    if (onTabChange) {
      onTabChange(newTab)
    } else {
      setInternalTab(newTab)
    }
  }
  const [indicator, setIndicator] = useState<{ width: number; x: number } | null>(null)
  const toggleGroupRef = useRef<HTMLDivElement>(null)
  const marketplace = useQuery({ queryKey: ["marketplace-skills"], queryFn: getMarketplaceSkills })
  const skillsData = marketplace.data?.skills
  const filtered = useMemo(() => {
    const list = skillsData ?? []
    const matchingSkills = list.filter((skill) =>
      `${skill.title} ${skill.namespace} ${skill.category}`.toLowerCase().includes(query.toLowerCase()),
    )

    return [...matchingSkills].sort((left, right) => {
      if (tab === "top") return right.paidInstalls - left.paidInstalls
      if (tab === "new") return left.rank - right.rank
      return right.trend - left.trend
    })
  }, [skillsData, query, tab])

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const activeItem = toggleGroupRef.current?.querySelector<HTMLElement>(`[data-skill-tab="${tab}"]`)
      if (activeItem) setIndicator({ width: activeItem.offsetWidth, x: activeItem.offsetLeft })
    }
    updateIndicator()
    window.addEventListener("resize", updateIndicator)
    return () => window.removeEventListener("resize", updateIndicator)
  }, [tab])

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div ref={toggleGroupRef}>
            <ToggleGroup
              aria-label="Skill ranking"
              className="relative"
              type="single"
              value={tab}
              onValueChange={(value) => {
                if (value === "trending" || value === "top" || value === "new") handleTabChange(value)
              }}
            >
              {indicator && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-1 left-0 z-0 rounded-md bg-background shadow-sm transition-[transform,width] duration-200 ease-out"
                  style={{ width: indicator.width, transform: `translateX(${indicator.x}px)` }}
                />
              )}
              <ToggleGroupItem
                className="relative z-10 h-7 px-3 text-xs font-medium data-[state=on]:bg-transparent data-[state=on]:shadow-none"
                data-skill-tab="trending"
                value="trending"
              >
                Trending
              </ToggleGroupItem>
              <ToggleGroupItem
                className="relative z-10 h-7 px-3 text-xs font-medium data-[state=on]:bg-transparent data-[state=on]:shadow-none"
                data-skill-tab="top"
                value="top"
              >
                Top
              </ToggleGroupItem>
              <ToggleGroupItem
                className="relative z-10 h-7 px-3 text-xs font-medium data-[state=on]:bg-transparent data-[state=on]:shadow-none"
                data-skill-tab="new"
                value="new"
              >
                New
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        <div className="relative sm:w-64"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 pl-8 text-sm" placeholder="Search skills" /></div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="hidden grid-cols-[2.25rem_minmax(0,1fr)_7rem_6.5rem_5rem] gap-3 border-b bg-muted/35 px-5 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid"><span>#</span><span>Skill</span><span>Price</span><span className="text-right">Installs</span><span>Trend</span></div>
        {marketplace.isLoading ? (
          <div className="px-5 py-14 text-center text-sm text-muted-foreground">Loading marketplace data…</div>
        ) : filtered.length ? (
          filtered.map((skill) => <SkillRow key={skill.id} skill={skill} />)
        ) : (
          <div className="px-5 py-14 text-center text-sm text-muted-foreground">
            {query ? `No skills match “${query}”.` : "No skills found. Run the local database seeder to populate skills."}
          </div>
        )}
      </div>
      {marketplace.isError && <p className="mt-3 text-xs text-muted-foreground">The marketplace index is temporarily unavailable.</p>}
    </section>
  )
}
