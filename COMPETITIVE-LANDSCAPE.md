# Skillsbay competitive landscape

_Research snapshot: 2026-09-16_

## Bottom line

Skillsbay is entering an established category: marketplaces and registries for
AI-agent skills. Its current combination is differentiated—private versioned
bundles, one-time USDC entitlement, x402 autonomous checkout, an on-chain
purchase record, and installation into the buyer's active project—but those
mechanics alone are unlikely to be a durable moat.

The best positioning is **the trusted paid distribution layer for production
agent skills**, rather than simply an on-chain marketplace.

## Direct competition

- [Techne Skills](https://techneskills.ai/) sells paid AI-agent skills with
  creator payouts, curation, versioning, visible file trees, and install
  instructions. It was in private beta at the time of this research.
- [SkillHQ](https://skillhq.dev/) sells validated Claude Code `SKILL.md`
  packages and Custom GPT configurations, with one-command CLI installation,
  anti-piracy claims, and an 85% creator revenue share.
- [Agensi](https://www.agensi.io/) sells one-time and subscription skills,
  supports cross-agent discovery through MCP, advertises creator verification
  and an eight-point security scan, and pays creators through Stripe or Solana
  USDC.

## Free-distribution incumbents

- [skills.sh](https://www.skills.sh/docs/cli) establishes expectations for
  cross-agent CLI installation, discovery, ranking, packs, and low-friction
  adoption.
- [ClawHub](https://github.com/openclaw/clawhub/blob/main/docs/quickstart.md)
  is OpenClaw's registry for skills and plugins, including search, install,
  updates, publishing, and origin tracking.

They are not paid-private-bundle systems, but they are the default alternatives
for users who can find an adequate free skill.

## Adjacent agent-commerce competition

- [PayanAgent](https://payanagent.com/) and
  [the402](https://the402.ai/docs/agents/) focus on discovering and buying
  callable agent/API services with x402.
- x402 itself supports agent-readable service discovery through Bazaar, so
  marketplace discovery is becoming infrastructure rather than a proprietary
  feature. See the [x402 buyer quickstart](https://docs.x402.org/getting-started/quickstart-for-buyers).

These are adjacent, not identical: they monetize service invocation, whereas
Skillsbay delivers a durable skill package into a local workspace.

## Relevant Colosseum precedents

- `newbabylonai-decentralized-appstore-for-ai-agents` — Renaissance, March
  2024: decentralized agent app store concept.
- `xaam` — Breakout, April 2025: marketplace for agents to access and monetize
  specialised MCP-enabled agents.
- `mcpay` — Cypherpunk, September 2025 winner: monetization of MCP tools,
  data sources, and agent capabilities via HTTP 402 micropayments.

These confirm that both decentralized agent-capability markets and x402-based
monetization have been actively explored.

## Recommended strategy

1. Lead with trust, not chain mechanics. The buyer promise should be:
   **verified, compatible, safely installable production skills**.
2. Treat these as table stakes:
   security scanning, human or high-signal review, full pre-purchase file-tree
   visibility, version diffs, provenance, compatibility testing, publisher
   reputation, and safe update/rollback controls.
3. Make the durable-license layer explicit: entitlement verification,
   reproducible installs, purchased-version history, update policy, and
   workspace-scoped access are meaningfully different from an API catalog.
4. Keep x402 and USDC as an agent-native checkout advantage, especially for
   autonomous buyers and global creator payouts, but do not present them as the
   sole moat. x402 is an open payment standard.
5. Find an initial supply wedge where quality materially matters—such as
   production engineering workflows, security-reviewed crypto skills, or
   high-value business operations—and earn trust before expanding into a broad
   undifferentiated catalog.

## Positioning draft

> Skillsbay is the trusted paid distribution layer for production AI-agent
> skills: discover a verified workflow, buy a durable license, and install the
> exact version safely into the project where your agent works.
