# SkillsBay

SkillsBay is a Web3-native package manager and marketplace for paid AI-agent skills. Publishers list private `SKILL.md` bundles, agents pay once in USDC through x402, and the CLI installs the purchased skill into `.agents/skills` or `.claude/skills`.

The project is designed for a Base + The Graph + Privy + Circle Paymaster stack:

- **Base** provides skill registration, purchase receipts, and immediate royalty settlement.
- **The Graph** indexes skills, purchases, author earnings, and installation analytics.
- **Privy** gives authors passwordless onboarding and embedded-wallet publishing.
- **x402** gives agents a standard HTTP 402 payment flow.
- **Circle Paymaster** lets the backend recorder pay Base gas in USDC instead of maintaining an ETH balance.

## System architecture

```mermaid
flowchart LR
  Author[Author] -->|Privy embedded wallet| Web[SkillsBay web app]
  Web -->|register / update skill| Registry[SkillRegistry on Base]
  Web -->|signed private bundle upload| Worker[Cloudflare Worker]
  Worker --> Storage[(D1 + private R2 bundles)]

  Agent[Agent or CLI] -->|GET paid bundle| Worker
  Worker -->|HTTP 402 challenge| Agent
  Agent -->|USDC x402 settlement| Registry
  Worker -->|ERC-4337 recordPurchase| Registry
  Paymaster[Circle Paymaster] -->|USDC gas payment| Worker

  Registry -->|events| Graph[The Graph subgraph]
  Graph -->|marketplace + analytics| Worker
  Worker -->|decrypted SKILL.md after receipt| Agent
```

## Purchase lifecycle

```mermaid
sequenceDiagram
  participant C as skillsbay CLI
  participant W as Cloudflare Worker
  participant F as x402 facilitator
  participant R as SkillRegistry
  participant P as Circle Paymaster
  participant G as The Graph

  C->>W: GET paid bundle
  W-->>C: 402 payment requirements (USDC)
  C->>F: Sign and settle x402 payment
  F->>R: Transfer USDC to registry
  F-->>W: Settled payment receipt
  W->>P: Submit sponsored ERC-4337 UserOperation
  P->>R: recordPurchase(skill, buyer, receipt)
  R->>R: Mark entitlement and prevent replay
  R->>R: Send 95% to author / 5% to treasury
  R-->>G: SkillPurchased event
  W-->>C: Decrypted SKILL.md
```

## Repository structure

```text
.
├── src/                         # Vite + React marketplace and author dashboard
│   ├── components/               # Atomic UI components and shadcn primitives
│   ├── pages/                    # Marketplace, skill, publish, and dashboard routes
│   └── lib/                      # Browser API and chain helpers
├── worker/                       # Cloudflare Worker API and x402 gate
│   ├── index.ts                  # API routes, settlement, Circle Paymaster recorder
│   └── storage.ts                # Encrypted R2 bundle storage
├── db/migrations/                # Cloudflare D1 schema migrations
├── shared/                       # Signed publishing and username authorization formats
├── packages/
│   ├── cli/                      # `npx skillsbay add <namespace>/<skill>`
│   └── contracts/                # Foundry project for SkillRegistry
│       ├── src/                  # Solidity source and mocks
│       ├── script/               # Guarded Sepolia and mainnet deployment scripts
│       └── test/                 # Foundry tests
├── subgraph/                     # The Graph manifest, schema, mappings, and ABI
└── .storybook/                   # Storybook configuration for the UI system
```

## Configuration map

All local configuration templates live at the workspace root. Each file belongs to one runtime, which keeps public browser values, Worker secrets, and deployment credentials separate.

| File | Used by | Contains |
| --- | --- | --- |
| `.env` | Vite | Browser-safe `VITE_*` values only. |
| `.dev.vars` | Wrangler local development | Worker secrets and local bindings. |
| `.env.sepolia` | Contract deploy command | Base Sepolia deployment inputs. |
| `.env.mainnet` | Contract deploy command | Base mainnet deployment inputs. |

Copy from the matching `.example` file. None of the real environment files should be committed.

## Smart-contract design

`SkillRegistry` is intentionally small. It does not custody publisher earnings or require a withdrawal flow. Purchase settlement distributes USDC in the same transaction that records the buyer’s entitlement.

```mermaid
classDiagram
  class SkillRegistry {
    +IERC20 usdc
    +address owner
    +address recorder
    +address platformTreasury
    +uint16 platformFeeBps
    +registerSkill(skillId, price, majorVersion, metadataURI)
    +updateSkill(skillId, price, active, metadataURI)
    +recordPurchase(skillId, buyer, amount, receiptHash)
    +setRecorder(recorder)
    +setPlatformFeeBps(feeBps)
    +getSkill(skillId)
  }

  class Publisher {
    +registerSkill
    +updateSkill
  }
  class CircleRecorder {
    +recordPurchase
  }
  class Treasury {
    +receive platform fee
  }
  class Buyer {
    +hasPurchased
  }

  Publisher --> SkillRegistry : owns a skill
  CircleRecorder --> SkillRegistry : recorder role
  SkillRegistry --> Treasury : immediate fee transfer
  SkillRegistry --> Buyer : purchase entitlement
```

### Roles and permissions

| Role | What it can do |
| --- | --- |
| Registry owner | Rotate the recorder and adjust the platform fee within the contract cap. |
| Publisher | Register a new skill and update only their own skill’s price, active state, and metadata URI. |
| Recorder smart account | Record a settled x402 receipt exactly once. It cannot edit skills or change protocol settings. |
| Buyer | Pays for a skill and receives a permanent on-chain purchase entitlement. |

### Settlement rules

```mermaid
flowchart LR
  PaidUSDC[USDC settled into registry] --> Receipt{Valid unique receipt?}
  Receipt -->|No| Revert[Revert]
  Receipt -->|Yes| Access[Record buyer entitlement]
  Access --> Author[95% to publisher]
  Access --> Treasury[5% to platform treasury]
```

The contract validates that the skill exists and is active, the amount equals its listed price, the buyer has not already purchased it, and the payment receipt has not already been processed.

## Deployment modes

| Command | Network | Initial owner and treasury |
| --- | --- | --- |
| `pnpm deploy:registry` | Base Sepolia | The deployment account |
| `pnpm deploy:registry -- --mainnet` | Base mainnet | The project Safe |

The mainnet script is chain-guarded and refuses to execute anywhere except Base mainnet. The guarded deploy command also checks `SKILL_REGISTRY_ADDRESS` and Foundry broadcast output before submitting a new deployment.

### Contract deployment

```bash
# Base Sepolia
cp .env.sepolia.example .env.sepolia
# Fill the placeholder values, then:
pnpm deploy:registry

# Base mainnet
cp .env.mainnet.example .env.mainnet
# Fill the placeholder values, then:
pnpm deploy:registry -- --mainnet
```

The recorder address configured at deployment must be the public address derived from the same secret configured in the Worker as `RECORDER_PRIVATE_KEY`.

## Circle Paymaster recorder

The Worker turns the recorder key into an EIP-7702 smart account and submits `recordPurchase` through an ERC-4337 bundler. Circle Paymaster charges the account’s USDC balance for gas.

```mermaid
flowchart LR
  Key[RECORDER_PRIVATE_KEY<br/>Worker secret] --> SmartAccount[EIP-7702 recorder account]
  SmartAccount -->|ERC-4337 UserOperation| Bundler[Bundler]
  Bundler -->|paymaster data + permit| Paymaster[Circle Paymaster]
  Paymaster -->|USDC gas charge| SmartAccount
  SmartAccount -->|recordPurchase| Registry[SkillRegistry]
```

For Base Sepolia, configure the Worker with:

```text
BASE_SEPOLIA_RPC_URL=<rpc-url>
RECORDER_PRIVATE_KEY=<dedicated-recorder-key>
BUNDLER_RPC_URL=<production-bundler-url>
SKILL_REGISTRY_ADDRESS=<deployed-registry>
X402_RECIPIENT_ADDRESS=<same-deployed-registry>
```

`BUNDLER_RPC_URL` has a public development fallback. Use a production bundler endpoint for a reliable hosted deployment. The recorder needs a small USDC operating balance, not ETH.

## Post-deployment configuration

After a successful contract deployment, configure the emitted registry address in all consumers:

```mermaid
flowchart TD
  Address[Deployed SkillRegistry address] --> Vite[VITE_SKILL_REGISTRY_ADDRESS]
  Address --> WorkerRegistry[Worker: SKILL_REGISTRY_ADDRESS]
  Address --> X402[Worker: X402_RECIPIENT_ADDRESS]
  Address --> Graph[subgraph.yaml source.address]
  DeployBlock[Deployment block] --> GraphBlock[subgraph.yaml startBlock]
```

Then deploy the subgraph and set `GRAPH_API_URL` in the Worker. The Worker uses the indexed data for marketplace rankings and author analytics.

```bash
pnpm --filter @skillsbay/subgraph run deploy
```

### Worker deployment

Deploy the marketplace UI and API with the explicit Worker script:

```bash
pnpm run deploy:worker
```

`SKILL_REGISTRY_ADDRESS` and `X402_RECIPIENT_ADDRESS` are public Worker variables and must both equal the deployed registry. Keep only the bundle encryption key and recorder private key in the Worker secret store.

## Local development

```bash
pnpm install
cp .dev.vars.example .dev.vars
pnpm db:migrate:local
pnpm dev
```

Run Storybook for the shadcn-based UI system:

```bash
pnpm storybook
```

## Verification

```bash
pnpm build
pnpm --filter skillsbay build
(cd packages/contracts && forge test)
pnpm --filter @skillsbay/subgraph codegen
pnpm --filter @skillsbay/subgraph build
```

## Security notes

- Never commit private keys, RPC credentials, deployment outputs containing sensitive data, or Cloudflare secrets.
- Keep `RECORDER_PRIVATE_KEY` only in the Worker secret store. Its associated address is limited by the registry to purchase recording.
- Keep the registry owner in a multisig Safe for production deployments.
- Use a unique encryption key for bundle storage and rotate service keys if compromise is suspected.
- Verify the deployed registry owner, recorder, treasury, USDC token, and fee before enabling payments.

## Hackathon tracks

The sponsor implementation details and demo evidence map are documented in [HACKATHON.md](./HACKATHON.md).
