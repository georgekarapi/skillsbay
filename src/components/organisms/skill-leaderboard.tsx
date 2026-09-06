import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { cn } from "cn";
import { getMarketplaceSkills, getSkillsShSkills } from "@/lib/marketplace-api";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SkillRow } from "@/components/organisms/skill-row";

export type SkillTab = "trending" | "top" | "new";

export interface SkillLeaderboardProps {
  tab?: SkillTab;
  onTabChange?: (tab: SkillTab) => void;
}

export function SkillLeaderboard({
  tab: controlledTab,
  onTabChange,
}: SkillLeaderboardProps = {}) {
  const [query, setQuery] = useState("");
  const [internalTab, setInternalTab] = useState<SkillTab>("trending");
  const [showImported, setShowImported] = useState(true);
  const tab = controlledTab ?? internalTab;
  const handleTabChange = (newTab: SkillTab) => {
    if (onTabChange) {
      onTabChange(newTab);
    } else {
      setInternalTab(newTab);
    }
  };
  const [indicator, setIndicator] = useState<{
    width: number;
    x: number;
  } | null>(null);
  const toggleGroupRef = useRef<HTMLDivElement>(null);
  const marketplace = useQuery({
    queryKey: ["marketplace-skills"],
    queryFn: getMarketplaceSkills,
  });
  const skillsSh = useQuery({
    queryKey: ["skills-sh"],
    queryFn: getSkillsShSkills,
    staleTime: 60 * 60 * 1_000,
  });
  const filtered = useMemo(() => {
    const native = (marketplace.data?.skills ?? []).map((s) => ({
      ...s,
      source: s.source ?? ("skillsbay" as const),
    }));
    const imported = showImported ? (skillsSh.data ?? []) : [];

    // De-duplicate: native SkillsBay skills win over imported ones with the same slug
    const seen = new Set(native.map((s) => s.slug));
    const merged = [...native, ...imported.filter((s) => !seen.has(s.slug))];

    const matchingSkills = merged.filter((skill) =>
      `${skill.title} ${skill.namespace} ${skill.category} ${skill.author}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );

    return [...matchingSkills].sort((left, right) => {
      if (tab === "top") return right.paidInstalls - left.paidInstalls;
      if (tab === "new") return left.rank - right.rank;
      // Trending: native skills first (by trend), then imported (by installs)
      const leftIsImported = left.source === "skills.sh" ? 1 : 0;
      const rightIsImported = right.source === "skills.sh" ? 1 : 0;
      if (leftIsImported !== rightIsImported)
        return leftIsImported - rightIsImported;
      if (!leftIsImported) return right.trend - left.trend;
      return right.paidInstalls - left.paidInstalls;
    });
  }, [marketplace.data, skillsSh.data, query, tab, showImported]);

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const activeItem = toggleGroupRef.current?.querySelector<HTMLElement>(
        `[data-skill-tab="${tab}"]`,
      );
      if (activeItem) {
        const width = activeItem.offsetWidth;
        const x = activeItem.offsetLeft;
        setIndicator((prev) =>
          prev?.width === width && prev?.x === x ? prev : { width, x },
        );
      }
    };
    updateIndicator();
    window.addEventListener("resize", updateIndicator, { passive: true });
    return () => window.removeEventListener("resize", updateIndicator);
  }, [tab]);

  const itemStateClass = indicator
    ? "data-[state=on]:border-transparent data-[state=on]:bg-transparent data-[state=on]:shadow-none dark:data-[state=on]:border-transparent dark:data-[state=on]:bg-transparent dark:data-[state=on]:shadow-none"
    : "data-[state=on]:border-border/60 data-[state=on]:bg-background data-[state=on]:shadow-xs dark:data-[state=on]:border-border/60 dark:data-[state=on]:bg-muted/90 dark:data-[state=on]:shadow-xs";

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div ref={toggleGroupRef}>
            <ToggleGroup
              aria-label="Skill ranking"
              className="relative border-border/60 bg-muted/40 dark:border-border/40 dark:bg-muted/20"
              type="single"
              value={tab}
              onValueChange={(value) => {
                if (value === "trending" || value === "top" || value === "new")
                  handleTabChange(value);
              }}
            >
              {indicator && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-1 left-0 z-0 rounded-md border border-border/60 bg-background shadow-xs transition-[transform,width] duration-200 ease-out will-change-transform dark:border-border/60 dark:bg-muted/90 dark:shadow-xs"
                  style={{
                    width: indicator.width,
                    transform: `translateX(${indicator.x}px)`,
                  }}
                />
              )}
              <ToggleGroupItem
                className={cn(
                  "relative z-10 h-7 px-3 text-xs font-medium text-muted-foreground/70 transition-colors hover:text-foreground data-[state=on]:font-semibold data-[state=on]:text-foreground dark:text-muted-foreground/70 dark:hover:text-foreground dark:data-[state=on]:text-foreground",
                  itemStateClass,
                )}
                data-skill-tab="trending"
                value="trending"
              >
                Trending
              </ToggleGroupItem>
              <ToggleGroupItem
                className={cn(
                  "relative z-10 h-7 px-3 text-xs font-medium text-muted-foreground/70 transition-colors hover:text-foreground data-[state=on]:font-semibold data-[state=on]:text-foreground dark:text-muted-foreground/70 dark:hover:text-foreground dark:data-[state=on]:text-foreground",
                  itemStateClass,
                )}
                data-skill-tab="top"
                value="top"
              >
                Top
              </ToggleGroupItem>
              <ToggleGroupItem
                className={cn(
                  "relative z-10 h-7 px-3 text-xs font-medium text-muted-foreground/70 transition-colors hover:text-foreground data-[state=on]:font-semibold data-[state=on]:text-foreground dark:text-muted-foreground/70 dark:hover:text-foreground dark:data-[state=on]:text-foreground",
                  itemStateClass,
                )}
                data-skill-tab="new"
                value="new"
              >
                New
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none">
            <Checkbox
              checked={showImported}
              onCheckedChange={(checked) => setShowImported(checked === true)}
            />
            Show skills.sh imports
          </label>
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-9 pl-8 text-sm"
            placeholder="Search skills"
          />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card [content-visibility:auto] [contain-intrinsic-size:auto_400px]">
        <div className="hidden grid-cols-[2.25rem_minmax(0,1fr)_7rem_6.5rem_5rem] gap-3 border-b bg-muted/35 px-5 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid">
          <span>#</span>
          <span>Skill</span>
          <span>Price</span>
          <span className="text-right">Installs</span>
          <span>Trend</span>
        </div>
        {marketplace.isLoading ? (
          <div className="px-5 py-14 text-center text-sm text-muted-foreground">
            Loading marketplace data…
          </div>
        ) : filtered.length ? (
          filtered.map((skill, index) => (
            <SkillRow key={skill.id} skill={skill} displayRank={index + 1} />
          ))
        ) : (
          <div className="px-5 py-14 text-center text-sm text-muted-foreground">
            {query
              ? `No skills match "${query}".`
              : "No skills found. Run the local database seeder to populate skills."}
          </div>
        )}
      </div>
      {marketplace.isError && (
        <p className="mt-3 text-xs text-muted-foreground">
          The marketplace index is temporarily unavailable.
        </p>
      )}
    </section>
  );
}
