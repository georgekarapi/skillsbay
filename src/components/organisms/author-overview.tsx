import { useQuery } from "@tanstack/react-query"
import { BarChart3, CircleDollarSign, Download, Wallet } from "lucide-react"
import { Link } from "react-router-dom"
import { getAuthorDashboard } from "@/lib/marketplace-api"
import { useAuthorAuth } from "@/components/providers/author-auth-context"
import { StatusDot } from "@/components/atoms/status-dot"
import { MetricCard } from "@/components/molecules/metric-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function AuthorOverview() {
  const author = useAuthorAuth()
  const authorAddress = author.walletAddress ?? "0x8df2000000000000000000000000000000007a31"
  const dashboard = useQuery({ queryKey: ["author-dashboard", authorAddress], queryFn: () => getAuthorDashboard(authorAddress) })
  const isLiveGraphData = dashboard.data?.source === "graph"
  const isDbData = dashboard.data?.source === "db"
  const data = dashboard.data?.data
  const sales = data?.sales ?? []
  const publishedSkills = data?.skills ?? []
  const totalSales = data?.totalSales ?? 0
  const grossRevenue = data?.grossRevenueUsdc ?? "0.00"
  const walletLabel = author.walletAddress ? `${author.walletAddress.slice(0, 6)}…${author.walletAddress.slice(-4)}` : "0x8dF2…7A31"

  return <div className="grid gap-6">
    {(isLiveGraphData || isDbData) && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><StatusDot className={isLiveGraphData ? undefined : "bg-emerald-500"} /> {isLiveGraphData ? "Live Graph index" : "Local database"}</div>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard label="Published skills" value={publishedSkills.length.toString()} detail={isLiveGraphData ? "Registered on Base Sepolia" : isDbData ? "Local database skills" : "Published skills"} icon={<BarChart3 className="size-4" />} />
      <MetricCard label="Paid installs" value={totalSales.toLocaleString()} detail={isLiveGraphData ? "Indexed purchase receipts" : isDbData ? "Local database purchases" : "Recent purchases"} icon={<Download className="size-4" />} />
      <MetricCard label="Creator payouts" value={`$${grossRevenue}`} detail="USDC sent directly to your wallet" icon={<CircleDollarSign className="size-4" />} />
      <MetricCard label="Settlement" value="95%" detail={`Sent instantly to ${walletLabel}`} icon={<Wallet className="size-4" />} />
    </div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(20rem,0.85fr)]">
      <Card><CardHeader><CardTitle>Published skills</CardTitle><CardDescription>{isLiveGraphData ? "Metadata and installation counts from the on-chain registry." : isDbData ? "Skills retrieved from local database." : "The Graph endpoint is not configured yet."}</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Skill</TableHead><TableHead>Version</TableHead><TableHead>Installs</TableHead><TableHead>Price</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader><TableBody>{publishedSkills.length ? publishedSkills.map((skill) => <TableRow key={skill.id}><TableCell><Link className="block rounded-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring" to={`/dashboard/skills/${skill.namespace}/${skill.slug}`}><p className="font-medium">{skill.title}</p><p className="font-mono text-xs text-muted-foreground">{skill.namespace}/{skill.slug}</p></Link></TableCell><TableCell>{skill.version}</TableCell><TableCell>{skill.paidInstalls.toLocaleString()}</TableCell><TableCell>${skill.priceUsdc}</TableCell><TableCell className="text-right"><span className={`rounded-full px-2 py-1 text-xs ${skill.active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>{skill.active ? "Active" : "Inactive"}</span></TableCell></TableRow>) : <TableRow><TableCell className="py-8 text-center text-sm text-muted-foreground" colSpan={5}>No registered skills yet.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
      <Card><CardHeader><CardTitle>Recent sales</CardTitle><CardDescription>{isLiveGraphData ? "Purchase receipts indexed by The Graph." : isDbData ? "Purchase history from local database." : "Purchase receipts will appear when The Graph endpoint is connected."}</CardDescription></CardHeader><CardContent><div className="grid gap-4">{sales.length ? sales.map((sale) => <div className="grid gap-1 border-b pb-4 last:border-0 last:pb-0" key={sale.id}><div className="flex items-start justify-between gap-3"><p className="min-w-0 truncate text-sm font-medium">{sale.skill}</p><p className="shrink-0 font-mono text-sm">${sale.amount}</p></div><p className="font-mono text-xs text-muted-foreground">{sale.buyer}</p><p className="text-xs text-muted-foreground">{sale.occurredAt}</p></div>) : <p className="py-8 text-center text-sm text-muted-foreground">No indexed purchases yet.</p>}</div></CardContent></Card>
    </div>
  </div>
}
