import type { Sale, Skill } from "@/types/marketplace"

export const skills: Skill[] = [
  { id: "thegraph/substreams-deployer", rank: 1, namespace: "thegraph", slug: "substreams-deployer", title: "Substreams Deployer", summary: "Turn a protocol prompt into a deployable Substreams pipeline with production-ready indexing conventions.", category: "The Graph", priceUsdc: "0.25", paidInstalls: 1842, trend: 28, author: "Graph Labs", authorAddress: "0x8dF2…7A31", version: "1.4.0", updatedAt: "2h ago", featured: true },
  { id: "defi/audited-automation", rank: 2, namespace: "defi", slug: "audited-automation", title: "Audited DeFi Automation", summary: "Guardrails and transaction policies for agents operating recurring DeFi workflows.", category: "DeFi", priceUsdc: "0.80", paidInstalls: 912, trend: 16, author: "Northstar", authorAddress: "0xA92e…19B8", version: "1.2.1", updatedAt: "1d ago" },
  { id: "openai/evals-rig", rank: 3, namespace: "openai", slug: "evals-rig", title: "Evals Rig", summary: "A practical evaluation workflow for agent tools, prompts, and multi-step task harnesses.", category: "Agent tooling", priceUsdc: "0.35", paidInstalls: 796, trend: 11, author: "Cora Kim", authorAddress: "0x35Be…820a", version: "1.8.0", updatedAt: "3d ago" },
  { id: "solidity/incident-response", rank: 4, namespace: "solidity", slug: "incident-response", title: "Incident Response", summary: "Structured triage and containment playbooks for Solidity production incidents.", category: "Security", priceUsdc: "1.20", paidInstalls: 605, trend: 8, author: "Sable Security", authorAddress: "0x3A81…917F", version: "2.0.0", updatedAt: "5d ago" },
  { id: "data/protocol-research", rank: 5, namespace: "data", slug: "protocol-research", title: "Protocol Research", summary: "Repeatable diligence workflows for onchain protocols using live Graph data.", category: "Research", priceUsdc: "0.20", paidInstalls: 449, trend: 5, author: "Mira", authorAddress: "0x90C4…ea12", version: "1.1.0", updatedAt: "6d ago" },
]

export const authorSales: Sale[] = [
  { id: "sale-1", skill: "Substreams Deployer", buyer: "0x2b1a…0Fd2", amount: "0.25", occurredAt: "8 minutes ago", transactionHash: "0x4c1b8f8f6eb25dbad3db8f9b42c4f42d48b3d03f06e7e4b8c17e08b1a4e517d4" },
  { id: "sale-2", skill: "Substreams Deployer", buyer: "0x71c4…e09A", amount: "0.25", occurredAt: "1 hour ago", transactionHash: "0x6c1b8f8f6eb25dbad3db8f9b42c4f42d48b3d03f06e7e4b8c17e08b1a4e517d4" },
  { id: "sale-3", skill: "Substreams Deployer", buyer: "0x108b…75D3", amount: "0.25", occurredAt: "3 hours ago", transactionHash: "0x7c1b8f8f6eb25dbad3db8f9b42c4f42d48b3d03f06e7e4b8c17e08b1a4e517d4" },
]
