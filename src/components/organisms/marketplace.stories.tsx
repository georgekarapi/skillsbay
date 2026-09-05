import type { Meta, StoryObj } from "@storybook/react-vite"
import { MemoryRouter } from "react-router-dom"
import { AuthorOverview } from "@/components/organisms/author-overview"
import { SiteHeader } from "@/components/organisms/site-header"
import { SkillLeaderboard } from "@/components/organisms/skill-leaderboard"
import { SkillRow } from "@/components/organisms/skill-row"
import { skills } from "@/data/mock-marketplace"

const meta = { title: "Organisms/Marketplace", component: SkillLeaderboard, decorators: [(Story) => <MemoryRouter><div className="min-h-screen bg-background p-6"><Story /></div></MemoryRouter>] } satisfies Meta<typeof SkillLeaderboard>
export default meta
type Story = StoryObj<typeof meta>

export const Leaderboard: Story = {}
export const SkillListRow: Story = { render: () => <SkillRow skill={skills[0]} /> }
export const Header: Story = { render: () => <SiteHeader /> }
export const AuthorDashboard: Story = { render: () => <AuthorOverview /> }
