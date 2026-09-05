import type { Meta, StoryObj } from "@storybook/react-vite"
import { Bell, ChevronDown } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "@/components/ui/sonner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const meta = { title: "Primitives/shadcn", component: Button, parameters: { layout: "centered" } } satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>

export const ButtonPreview: Story = { args: { children: "Connect wallet" } }
export const InputPreview: Story = { render: () => <Input className="w-72" placeholder="Search skills..." /> }
export const TextareaPreview: Story = { render: () => <Textarea className="w-72" placeholder="A concise skill summary" /> }
export const SelectPreview: Story = { render: () => <Select><SelectTrigger className="w-48"><SelectValue placeholder="Choose category" /></SelectTrigger><SelectContent><SelectItem value="graph">The Graph</SelectItem><SelectItem value="defi">DeFi</SelectItem></SelectContent></Select> }
export const BadgePreview: Story = { render: () => <Badge>$0.25 USDC</Badge> }
export const CardPreview: Story = { render: () => <Card className="w-80"><CardHeader><CardTitle>Substreams Deployer</CardTitle><CardDescription>Paid skill card</CardDescription></CardHeader><CardContent>1,842 paid installs</CardContent></Card> }
export const TabsPreview: Story = { render: () => <Tabs defaultValue="trending" className="w-80"><TabsList><TabsTrigger value="trending">Trending</TabsTrigger><TabsTrigger value="new">New</TabsTrigger></TabsList><TabsContent value="trending">Top ranked skills</TabsContent><TabsContent value="new">Fresh releases</TabsContent></Tabs> }
export const ToggleGroupPreview: Story = { render: () => <ToggleGroup type="single" defaultValue="trending"><ToggleGroupItem value="trending">Trending</ToggleGroupItem><ToggleGroupItem value="top">Top</ToggleGroupItem><ToggleGroupItem value="new">New</ToggleGroupItem></ToggleGroup> }
export const TablePreview: Story = { render: () => <Table className="w-96"><TableHeader><TableRow><TableHead>Skill</TableHead><TableHead>Price</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Substreams Deployer</TableCell><TableCell>$0.25</TableCell></TableRow></TableBody></Table> }
export const DialogPreview: Story = { render: () => <Dialog><DialogTrigger asChild><Button>Open dialog</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Publish skill</DialogTitle><DialogDescription>Confirm this signed bundle upload to SkillsBay.</DialogDescription></DialogHeader></DialogContent></Dialog> }
export const DropdownPreview: Story = { render: () => <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline">Actions <ChevronDown /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem>Edit skill</DropdownMenuItem><DropdownMenuItem>Deactivate</DropdownMenuItem></DropdownMenuContent></DropdownMenu> }
export const SheetPreview: Story = { render: () => <Sheet><SheetTrigger asChild><Button variant="outline">Open sheet</Button></SheetTrigger><SheetContent><SheetTitle>Navigation</SheetTitle></SheetContent></Sheet> }
export const AvatarPreview: Story = { render: () => <Avatar><AvatarFallback>GL</AvatarFallback></Avatar> }
export const SeparatorPreview: Story = { render: () => <div className="w-72">Publisher<Separator className="my-3" />Graph Labs</div> }
export const TooltipPreview: Story = { render: () => <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="icon"><Bell /></Button></TooltipTrigger><TooltipContent>Purchase notifications</TooltipContent></Tooltip></TooltipProvider> }
export const SkeletonPreview: Story = { render: () => <div className="grid gap-2"><Skeleton className="h-4 w-60" /><Skeleton className="h-4 w-44" /></div> }
export const AlertPreview: Story = { render: () => <Alert className="w-96"><AlertTitle>Indexing purchase</AlertTitle><AlertDescription>Your Graph receipt is being confirmed.</AlertDescription></Alert> }
export const ProgressPreview: Story = { render: () => <Progress className="w-72" value={62} /> }
export const SonnerPreview: Story = { render: () => <><Button onClick={() => window.dispatchEvent(new Event("skillsbay-toast"))}>Show toast</Button><Toaster /></> }
