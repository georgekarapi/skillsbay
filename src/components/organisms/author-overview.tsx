import { useQuery } from "@tanstack/react-query"
import { BarChart3, CircleDollarSign, Download, Globe, Plus, Wallet } from "lucide-react"
import { Link } from "react-router-dom"
import { getAuthorDashboard, getSkillsShSkills } from "@/lib/marketplace-api"
import { useAuthorAuth } from "@/components/providers/author-auth-context"
import { StatusDot } from "@/components/atoms/status-dot"
import { MetricCard } from "@/components/molecules/metric-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function formatInstalls(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return count.toLocaleString()
}

export function AuthorOverview({ authorAddress: addressProp }: { authorAddress?: string } = {}) {
  const author = useAuthorAuth()
  const authorAddress = addressProp ?? author.walletAddress
  const dashboard = useQuery({
    queryKey: ["author-dashboard", authorAddress],
    queryFn: () => getAuthorDashboard(authorAddress!),
    enabled: Boolean(authorAddress),
  })
  const skillsSh = useQuery({ queryKey: ["skills-sh"], queryFn: getSkillsShSkills, staleTime: 60 * 60 * 1_000 })
  const isLiveGraphData = dashboard.data?.source === "graph"
  const isDbData = dashboard.data?.source === "db"
  const data = dashboard.data?.data
  const sales = data?.sales ?? []
  const publishedSkills = data?.skills ?? []
  const totalSales = data?.totalSales ?? 0
  const grossRevenue = data?.grossRevenueUsdc ?? "0.00"
  const walletLabel = authorAddress ? `${authorAddress.slice(0, 6)}…${authorAddress.slice(-4)}` : "—"
  const importedSkills = skillsSh.data ?? []
  const importedCount = importedSkills.length
  const totalImportedInstalls = importedSkills.reduce((sum, s) => sum + s.paidInstalls, 0)

  return <div className="grid gap-6">
    {(isLiveGraphData || isDbData) && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><StatusDot className={isLiveGraphData ? undefined : "bg-emerald-500"} /> {isLiveGraphData ? "Live Graph index" : "Local database"}</div>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <MetricCard label="Published skills" value={publishedSkills.length.toString()} detail={isLiveGraphData ? "Registered on-chain" : isDbData ? "Local database skills" : "Published skills"} icon={<BarChart3 className="size-4" />} />
      <MetricCard label="Paid installs" value={totalSales.toLocaleString()} detail={isLiveGraphData ? "Indexed purchase receipts" : isDbData ? "Local database purchases" : "Recent purchases"} icon={<Download className="size-4" />} />
      <MetricCard label="Creator payouts" value={`$${grossRevenue}`} detail="USDC sent directly to your wallet" icon={<CircleDollarSign className="size-4" />} />
      <MetricCard label="Settlement" value="95%" detail={`Sent instantly to ${walletLabel}`} icon={<Wallet className="size-4" />} />
      <MetricCard label="Imported skills" value={importedCount.toString()} detail={`${formatInstalls(totalImportedInstalls)} free installs via skills.sh`} icon={<Globe className="size-4" />} />
    </div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(20rem,0.85fr)]">
      <Card><CardHeader><CardTitle>Published skills</CardTitle><CardDescription>{isLiveGraphData ? "Metadata and installation counts from the on-chain registry." : isDbData ? "Skills retrieved from local database." : "The Graph endpoint is not configured yet."}</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Skill</TableHead><TableHead>Version</TableHead><TableHead>Installs</TableHead><TableHead>Price</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader><TableBody>{publishedSkills.length ? publishedSkills.map((skill) => <TableRow key={skill.id}><TableCell><Link className="block rounded-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring" to={`/dashboard/skills/${skill.namespace}/${skill.slug}`}><p className="font-medium">{skill.title}</p><p className="font-mono text-xs text-muted-foreground">{skill.namespace}/{skill.slug}</p></Link></TableCell><TableCell>{skill.version}</TableCell><TableCell>{skill.paidInstalls.toLocaleString()}</TableCell><TableCell>${skill.priceUsdc}</TableCell><TableCell className="text-right"><span className={`rounded-full px-2 py-1 text-xs ${skill.active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>{skill.active ? "Active" : "Inactive"}</span></TableCell></TableRow>) : <TableRow><TableCell className="py-12 text-center text-sm text-muted-foreground" colSpan={5}><div className="flex flex-col items-center justify-center gap-2"><p className="font-medium text-foreground">No registered skills yet</p><p className="max-w-xs text-xs text-muted-foreground">Publish your first SKILL.md bundle to start earning USDC royalties directly into your wallet.</p><Button asChild className="mt-2 gap-1.5" size="sm"><Link to="/dashboard/skills/new"><Plus className="size-3.5" /> Publish a skill</Link></Button></div></TableCell></TableRow>}</TableBody></Table></CardContent></Card>
      <div className="grid gap-6 content-start">
        <Card><CardHeader><CardTitle>Recent sales</CardTitle><CardDescription>{isLiveGraphData ? "Purchase receipts indexed by The Graph." : isDbData ? "Purchase history from local database." : "Purchase receipts will appear when The Graph endpoint is connected."}</CardDescription></CardHeader><CardContent><div className="grid gap-4">{sales.length ? sales.map((sale) => <div className="grid gap-1 border-b pb-4 last:border-0 last:pb-0" key={sale.id}><div className="flex items-start justify-between gap-3"><p className="min-w-0 truncate text-sm font-medium">{sale.skill}</p><p className="shrink-0 font-mono text-sm">${sale.amount}</p></div><p className="font-mono text-xs text-muted-foreground">{sale.buyer}</p><p className="text-xs text-muted-foreground">{sale.occurredAt}</p></div>) : <p className="py-8 text-center text-sm text-muted-foreground">No indexed purchases yet.</p>}</div></CardContent></Card>
        {importedSkills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Imported from skills.sh
                <span className="rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                  {importedCount}
                </span>
              </CardTitle>
              <CardDescription>Open-source skills surfaced from the skills.sh leaderboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {importedSkills.slice(0, 8).map((skill) => (
                  <div className="flex items-center justify-between gap-3 text-sm" key={skill.id}>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{skill.title}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">{skill.author}/{skill.slug}</p>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{formatInstalls(skill.paidInstalls)}</span>
                  </div>
                ))}
                {importedSkills.length > 8 && (
                  <p className="text-xs text-muted-foreground">+{importedSkills.length - 8} more in the marketplace</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  </div>
}
