import type { Skill } from "@/types/marketplace"
import type { PublishAuthorization } from "@skillsbay/shared/publish-authorization"
import type { BundleReadAuthorization } from "@skillsbay/shared/publish-authorization"
import type { UsernameAuthorization } from "@skillsbay/shared/publish-authorization"
import { createInstallRequestAuthorizationMessage } from "@skillsbay/shared/publish-authorization"

export type AuthorDashboardData = {
  totalSales: number
  grossRevenueUsdc: string
  sales: Array<{ id: string; skill: string; buyer: string; amount: string; occurredAt: string; transactionHash: string }>
  skills: Array<{ id: string; namespace: string; slug: string; title: string; priceUsdc: string; version: string; paidInstalls: number; active: boolean }>
}

type ApiListing = Omit<Skill, "rank" | "authorAddress" | "updatedAt"> & Partial<Pick<Skill, "rank" | "authorAddress" | "updatedAt" | "featured">>

export function endpoint(path: string) {
  // The marketplace UI and API are served by the same Worker origin.
  return path
}

function normalizeSkill(skill: ApiListing, index: number): Skill {
  return { ...skill, rank: skill.rank ?? index + 1, summary: skill.summary ?? "A paid agent skill published on Skillsbay.", category: skill.category ?? "Agent skill", trend: skill.trend ?? 0, authorAddress: skill.authorAddress ?? skill.author, updatedAt: skill.updatedAt ?? "Indexed on-chain" } as Skill
}

export async function getMarketplaceSkills() {
  const response = await fetch(endpoint("/v1/skills"))
  if (!response.ok) throw new Error(`Marketplace request failed (${response.status})`)
  const payload = await response.json() as { data: ApiListing[]; source?: "graph" | "db" | "unavailable" }
  return { skills: payload.data.map(normalizeSkill), source: payload.source ?? "unavailable" }
}

export async function getMarketplaceSkill(username: string, skillSlug: string) {
  const response = await fetch(endpoint(`/v1/skills/${encodeURIComponent(username)}/${encodeURIComponent(skillSlug)}`))
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Skill request failed (${response.status})`)
  const payload = await response.json() as { data: ApiListing }
  return normalizeSkill(payload.data, 0)
}

export async function recordBrowserPurchase(input: { skillId: string; buyer: string; paymentTransactionHash: string; installRequestId?: string }) {
  const response = await fetch(endpoint(`/v1/purchases/${input.skillId}`), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) })
  const payload = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(payload.error ?? "Could not record the purchase")
}

export async function getPurchaseAccess(skillId: string, buyer: string) {
  const response = await fetch(endpoint(`/v1/skills/${skillId}/access/${buyer}`))
  if (!response.ok) throw new Error("Could not verify purchase access")
  const payload = await response.json() as { data: { purchased: boolean } }
  return payload.data.purchased
}

export async function completeInstallRequest(input: { id: string; skillId: string; buyer: string; signMessage: (message: string) => Promise<string> }) {
  const issuedAt = new Date().toISOString()
  const signature = await input.signMessage(createInstallRequestAuthorizationMessage({ installRequestId: input.id, skillId: input.skillId, buyer: input.buyer, issuedAt }))
  const response = await fetch(endpoint(`/v1/install-requests/${encodeURIComponent(input.id)}/complete`), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ buyer: input.buyer, issuedAt, signature }) })
  const payload = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(payload.error ?? "Could not unlock this installation")
}

export type InstallRequestValidation = {
  valid: boolean
  data?: { id: string; skillId: string; status: string; expiresAt: string }
  error?: string
  code?: string
}

export async function validateInstallRequest(id: string, skillId?: string): Promise<InstallRequestValidation> {
  const query = skillId ? `?skillId=${encodeURIComponent(skillId)}` : ""
  const response = await fetch(endpoint(`/v1/install-requests/${encodeURIComponent(id)}/validate${query}`))
  const payload = (await response.json().catch(() => ({}))) as InstallRequestValidation
  if (!response.ok) {
    return {
      valid: false,
      error: payload.error ?? "Checkout session is expired or invalid",
      code: payload.code ?? "INVALID",
    }
  }
  return payload
}

export async function getAuthorDashboard(address: string) {
  const response = await fetch(endpoint(`/v1/authors/${address}`))
  if (!response.ok) throw new Error(`Author dashboard request failed (${response.status})`)
  const payload = await response.json() as { data: AuthorDashboardData; source?: "graph" | "db" | "unavailable" }
  return { data: payload.data, source: payload.source ?? "unavailable" }
}

export class MarketplaceApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function publishBundle(input: PublishAuthorization & { markdown: string; signature: string; category?: string }) {
  const response = await fetch(endpoint(`/v1/publish/bundles/${input.skillId}`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  })
  const payload = await response.json().catch(() => ({})) as { data?: { skillId: string }; error?: string; code?: string }
  if (!response.ok) throw new MarketplaceApiError(payload.error ?? "Could not publish bundle", response.status, payload.code)
  return payload.data
}

export async function getAuthorBundle(input: BundleReadAuthorization & { signature: string }) {
  const response = await fetch(endpoint(`/v1/publish/bundles/${input.skillId}/read`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  })
  const payload = await response.json().catch(() => ({})) as { data?: { markdown: string }; error?: string; code?: string }
  if (!response.ok) throw new MarketplaceApiError(payload.error ?? "Could not load the private bundle", response.status, payload.code)
  return payload.data!.markdown
}

export type AuthorProfile = { walletAddress: string; username: string; createdAt?: string }

export async function getAuthorProfile(address: string) {
  const response = await fetch(endpoint(`/v1/authors/${address}/profile`))
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Author profile request failed (${response.status})`)
  const payload = await response.json() as { data: AuthorProfile }
  return payload.data
}

export async function claimAuthorUsername(input: UsernameAuthorization & { signature: string }) {
  const response = await fetch(endpoint(`/v1/authors/${input.walletAddress}/username`), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  })
  const payload = await response.json().catch(() => ({})) as { data?: AuthorProfile; error?: string; code?: string }
  if (!response.ok) throw new MarketplaceApiError(payload.error ?? "Could not claim publisher username", response.status, payload.code)
  return payload.data!
}

export async function checkUsernameAvailability(username: string) {
  const response = await fetch(endpoint(`/v1/usernames/${encodeURIComponent(username)}`))
  if (!response.ok) throw new Error(`Username availability request failed (${response.status})`)
  const payload = await response.json() as { data: { username: string; available: boolean } }
  return payload.data
}

export async function getSkillsShSkills() {
  const response = await fetch(endpoint("/v1/skills-sh"))
  if (!response.ok) throw new Error(`skills.sh import request failed (${response.status})`)
  const payload = await response.json() as { data: Array<Omit<Skill, "rank" | "source" | "externalUrl">> }
  return payload.data.map((skill, index): Skill => ({
    ...skill,
    rank: index + 1,
    source: "skills.sh",
    // The id is `skills-sh:<full-path>` (e.g., `skills-sh:owner/repo/slug` or `skills-sh:site/domain/slug`)
    externalUrl: `https://skills.sh/${skill.id.replace(/^skills-sh:/, "")}`,
  }))
}
