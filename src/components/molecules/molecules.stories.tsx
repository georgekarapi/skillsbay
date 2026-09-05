import type { Meta, StoryObj } from "@storybook/react-vite"
import { CircleDollarSign } from "lucide-react"
import { CommandCopy } from "@/components/molecules/command-copy"
import { MetricCard } from "@/components/molecules/metric-card"
import { PriceBadge } from "@/components/molecules/price-badge"

const meta = { title: "Molecules/Marketplace", component: CommandCopy, parameters: { layout: "centered" } } satisfies Meta<typeof CommandCopy>
export default meta
type Story = StoryObj<typeof meta>

export const InstallCommand: Story = { args: { command: "npx skillsbay add thegraph/substreams-deployer" } }
export const Price: Story = { args: { command: "" }, render: () => <PriceBadge price="0.25" /> }
export const EarningsMetric: Story = { args: { command: "" }, render: () => <MetricCard label="Gross earnings" value="$741.00" detail="All-time USDC revenue" icon={<CircleDollarSign className="size-4" />} /> }
