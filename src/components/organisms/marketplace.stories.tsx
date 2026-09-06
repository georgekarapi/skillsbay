import type { Meta, StoryObj } from "@storybook/react-vite"
import { MemoryRouter } from "react-router-dom"
import { HeroSection } from "@/components/organisms/hero-section"
import { AuthorOverview } from "@/components/organisms/author-overview"
import { SiteHeader } from "@/components/organisms/site-header"
import { SkillLeaderboard } from "@/components/organisms/skill-leaderboard"
import { SkillRow } from "@/components/organisms/skill-row"

const sampleStorySkill = {
  id: "thegraph/substreams-deployer",
  rank: 1,
  namespace: "thegraph",
  slug: "substreams-deployer",
  title: "Substreams Deployer",
  summary: "Turn a protocol prompt into a deployable Substreams pipeline.",
  category: "The Graph",
  priceUsdc: "0.25",
  paidInstalls: 1842,
  trend: 28,
  author: "thegraph",
  authorAddress: "0x8df2000000000000000000000000000000007a31",
  version: "1.4.0",
  updatedAt: "2h ago",
  featured: true,
}

const meta = { title: "Organisms/Marketplace", component: SkillLeaderboard, decorators: [(Story) => <MemoryRouter><div className="min-h-screen bg-background p-6"><Story /></div></MemoryRouter>] } satisfies Meta<typeof SkillLeaderboard>
export default meta
type Story = StoryObj<typeof SkillLeaderboard>

export const Leaderboard: Story = {}
export const Hero: Story = { render: () => <HeroSection /> }
export const SkillListRow: Story = { render: () => <SkillRow skill={sampleStorySkill} displayRank={1} /> }
export const Header: Story = { render: () => <SiteHeader /> }
export const AuthorDashboard: Story = { render: () => <AuthorOverview /> }

