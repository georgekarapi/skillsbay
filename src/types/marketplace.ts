export const SKILL_CATEGORIES = [
  "Agent tooling",
  "Automation",
  "DeFi",
  "Development",
  "Research",
  "Security",
  "The Graph",
  "Data & Analytics",
  "Web3",
  "Productivity",
  "Other",
] as const

export type SkillCategory = typeof SKILL_CATEGORIES[number]

export type Skill = {
  id: string
  rank: number
  namespace: string
  slug: string
  title: string
  summary: string
  category: string
  priceUsdc: string
  paidInstalls: number
  trend: number
  author: string
  authorAddress: string
  version: string
  updatedAt: string
  featured?: boolean
  source?: "skillsbay" | "skills.sh"
  externalUrl?: string
}

export type Sale = {
  id: string
  skill: string
  buyer: string
  amount: string
  occurredAt: string
  transactionHash: string
}
