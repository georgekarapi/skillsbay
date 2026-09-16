# Skillsbay CLI

Install paid AI-agent skills with a single command. Skillsbay verifies the
purchase, unlocks the private `SKILL.md`, and installs it for your local agent.

```bash
npx skillsbay add <publisher>/<skill>
```

Browse the marketplace at [skillsbay.dev](https://skillsbay.dev).

## Install a marketplace skill

```bash
npx skillsbay search subgraph
npx skillsbay info karapi/skillsbay
npx skillsbay add karapi/skillsbay
```

Without an agent wallet, the CLI opens a browser checkout URL and waits for
payment confirmation. With a funded Base Sepolia agent wallet, it completes the
x402 USDC payment autonomously:

```bash
export SKILLSBAY_PRIVATE_KEY=0x<funded-agent-wallet-private-key>
npx skillsbay add karapi/skillsbay --yes
unset SKILLSBAY_PRIVATE_KEY
```

Skills are installed in the current workspace, preferring
`.agents/skills/<skill>/SKILL.md` and supporting
`.claude/skills` when selected.

## GitHub fallback

Bare `publisher/skill` identifiers are always resolved through Skillsbay to
avoid accidentally bypassing payment. To deliberately use the upstream
GitHub installer instead, pass `--fallback`:

```bash
npx skillsbay add owner/repository --fallback
```

An explicit Git URL is also treated as a repository install:

```bash
npx skillsbay add https://github.com/owner/repository.git
```

## Configuration

The API origin is embedded when the CLI is built. Releases are built by GitHub
Actions with `https://skillsbay.dev`, so users cannot replace it at runtime.
For a local build, add this to the repository-root `.env` before building:

```bash
SKILLSBAY_API_URL=http://localhost:5173
pnpm --filter skillsbay build
```

Never commit `.env`, `SKILLSBAY_PRIVATE_KEY`, or expose either in agent instructions.

## Commands

```text
skillsbay search [query]        Search marketplace skills
skillsbay info <publisher/skill> Inspect price and metadata
skillsbay add <publisher/skill> Purchase and install a skill
skillsbay list                  List installed skills
skillsbay remove [skills]       Remove installed skills
```

Use `npx skillsbay --help` for all options.
