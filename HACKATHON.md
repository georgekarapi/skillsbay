# SkillsBay hackathon submission guide

SkillsBay is a reusable, paid `SKILL.md` distribution layer for AI agents. The demo is designed for the **The Graph — Best AI Tooling or AI Use Case (From Scratch)** and **Privy — Best financial flow** tracks.

## Partner use cases

| Partner | SkillsBay use case | Demo proof |
| --- | --- | --- |
| Base | Base is the settlement network for skill registration, purchase receipts, and direct USDC author/treasury splits. | Publish a skill and complete a purchase; show the registration and payment receipt on Base Sepolia. |
| The Graph | The Graph indexes skills and purchases for marketplace discovery, creator analytics, and live sales data. | Complete an install, then refresh the marketplace and author dashboard to show the indexed sale and earnings. |
| Privy | Privy gives authors social/email/passkey onboarding, an embedded wallet, and one-click publishing or management. | Sign in without an extension, publish from the embedded wallet, then show earnings arriving at that wallet. |
| x402 | x402 provides the HTTP 402 payment flow that lets a funded agent buy a capability as it installs it. | Run `npx skillsbay add … --wallet env` and show the resulting local `SKILL.md`. |
| Circle Paymaster | Circle Paymaster supports reliable USDC-denominated settlement operations. | Complete a purchase and show the on-chain receipt and direct payout without asking the author to manage settlement gas. |

## Required live configuration

The local fallback is intentionally marked **Local demo data** in the UI. It is not hackathon evidence. Before recording, configure and use:

1. A deployed `SkillRegistry` on Base Sepolia and a Base Sepolia USDC address appropriate for x402.
2. A deployed Subgraph Studio Subgraph with its address substituted in `subgraph/subgraph.yaml`, then its live query URL in `GRAPH_API_URL`.
3. A Privy app ID in `VITE_PRIVY_APP_ID`.
4. The Worker bindings and secrets listed in the [README](./README.md#cloudflare-setup), including a funded recorder account.

## Two-to-four minute demo order

1. Open the marketplace and point out the green **Live Graph index** label.
2. Sign in as an author with Privy; show the created embedded wallet and one-time publisher username claim.
3. Publish a Graph/Substreams `SKILL.md` under that username. Show the Base Sepolia registration transaction and signed private upload.
4. In a clean agent workspace, use `npx skillsbay add namespace/slug --wallet env`. Show the x402 payment and resulting local `SKILL.md`.
5. Refresh the marketplace and dashboard to show the Subgraph-indexed install and the exact USDC payout sent to the author’s Privy wallet.

## Judge runbook

```bash
pnpm install
pnpm db:migrate:local
pnpm build
pnpm --filter skillsbay build
(cd packages/contracts && forge test)
pnpm --filter @skillsbay/subgraph codegen
pnpm --filter @skillsbay/subgraph build
```

The README covers the public architecture and local verification workflow. Operational credentials and implementation configuration remain private to the deployment environment.
