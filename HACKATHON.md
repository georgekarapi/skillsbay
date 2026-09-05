# SkillsBay hackathon submission guide

SkillsBay is a reusable, paid `SKILL.md` distribution layer for AI agents. The demo is designed for the **The Graph — Best AI Tooling or AI Use Case (From Scratch)** and **Privy — Best financial flow** tracks.

## Sponsor evidence

| Track | Load-bearing implementation | Demo proof |
| --- | --- | --- |
| The Graph AI tooling | `subgraph/` indexes `SkillRegistered` and paid-install receipts, including the exact author payout. The Worker queries the deployed Subgraph to rank skills and calculate creator payouts. The CLI is reusable x402 tooling for installing Graph-focused skills. | Configure `GRAPH_API_URL`, publish a skill, complete an x402 install, then refresh the marketplace and author dashboard to show the indexed receipt and payout. |
| Privy financial flow | Privy social/email/passkey sign-in creates an embedded wallet; authors use it to register a skill and sign bundle authorization. Each settled purchase sends their USDC share to that wallet automatically. | Sign in without an extension, publish from the embedded wallet, settle a purchase, and show USDC arriving at that same wallet. |
| Base + x402 | The Worker protects content with an x402 Base Sepolia USDC challenge. Its funded recorder converts the settled receipt into the registry’s on-chain entitlement and revenue split. | Run `skillsbay add … --wallet env` with a funded agent key and show `SKILL.md` written into an agent workspace. |

## Required live configuration

The local fallback is intentionally marked **Local demo data** in the UI. It is not hackathon evidence. Before recording, configure and use:

1. A deployed `SkillRegistry` on Base Sepolia and a Base Sepolia USDC address appropriate for x402.
2. A deployed Subgraph Studio Subgraph with its address substituted in `subgraph/subgraph.yaml`, then its live query URL in `GRAPH_API_URL`.
3. A Privy app ID in `VITE_PRIVY_APP_ID`.
4. The Worker bindings and secrets listed in the [README](./README.md#cloudflare-setup), including a funded recorder account.

## Two-to-four minute demo order

1. Open the marketplace and point out the green **Live Graph index** label.
2. Sign in as an author with Privy; show the created embedded wallet and one-time publisher username claim.
3. Publish a Graph/Substreams `SKILL.md` under that username. Show the Base Sepolia `registerSkill` transaction and signed encrypted upload.
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

The publishing signature protocol, storage encryption, and x402 recorder setup are described in the README.
