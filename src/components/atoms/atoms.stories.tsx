import type { Meta, StoryObj } from "@storybook/react-vite"
import { BrandMark } from "@/components/atoms/brand-mark"
import { SkillsBayLogo } from "@/components/atoms/skillsbay-logo"
import { StatusDot } from "@/components/atoms/status-dot"

const meta = { title: "Atoms/Identity", component: SkillsBayLogo, parameters: { layout: "centered" } } satisfies Meta<typeof SkillsBayLogo>
export default meta
type Story = StoryObj<typeof meta>

export const FullLogo: Story = { render: () => <SkillsBayLogo className="h-9 w-auto" /> }
export const WaveMark: Story = { render: () => <BrandMark className="size-8" /> }
export const OnlineStatus: Story = { render: () => <div className="flex items-center gap-2 text-sm"><StatusDot /> Graph index connected</div> }
