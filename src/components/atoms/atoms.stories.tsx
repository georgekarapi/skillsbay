import type { Meta, StoryObj } from "@storybook/react-vite"
import { BrandMark } from "@/components/atoms/brand-mark"
import { StatusDot } from "@/components/atoms/status-dot"

const meta = { title: "Atoms/Identity", component: BrandMark, parameters: { layout: "centered" } } satisfies Meta<typeof BrandMark>
export default meta
type Story = StoryObj<typeof meta>

export const Brand: Story = { render: () => <div className="flex items-center gap-2 font-semibold"><BrandMark /> skillsbay</div> }
export const OnlineStatus: Story = { render: () => <div className="flex items-center gap-2 text-sm"><StatusDot /> Graph index connected</div> }
