import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  Terminal,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Coins,
  Copy,
  Check,
  BookOpen,
  Code2,
  Workflow,
  Sparkles,
  Server,
  CheckCircle2,
} from "lucide-react"
import { MarketplaceShell } from "@/components/templates/marketplace-shell"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { CommandText } from "@/components/molecules/command-text"

interface CodeBlockProps {
  code: string
  language?: string
  caption?: string
}

function CodeSnippet({ code, caption }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = code
        textarea.setAttribute("readonly", "")
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        const copied = document.execCommand("copy")
        document.body.removeChild(textarea)
        if (!copied) throw new Error("Clipboard access was denied")
      }
      setCopied(true)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error("Failed to copy")
    }
  }

  return (
    <div className="relative my-3 overflow-hidden rounded-xl border border-border/80 bg-muted/40 font-mono text-xs">
      {caption && (
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/70 px-4 py-2 text-[11px] text-muted-foreground">
          <span className="font-mono">{caption}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      )}
      <div className="overflow-x-auto p-4 leading-relaxed text-foreground/90">
        {!caption && (
          <button
            type="button"
            onClick={handleCopy}
            className="absolute right-3 top-3 rounded-md bg-muted/80 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
          </button>
        )}
        <pre className="m-0 font-mono"><CommandText text={code} /></pre>
      </div>
    </div>
  )
}

export function DocsPage() {
  const [activeSection, setActiveSection] = useState("overview")

  const sections = [
    { id: "overview", label: "Overview", icon: BookOpen },
    { id: "how-it-works", label: "How It Works", icon: Workflow },
    { id: "cli-guide", label: "CLI & Installation", icon: Terminal },
    { id: "integrations", label: "Agent Integrations", icon: Cpu },
    { id: "web3-stack", label: "Web3 Stack & x402", icon: Layers },
    { id: "for-authors", label: "Publishing Guide", icon: Code2 },
  ]

  useEffect(() => {
    const updateActiveSection = () => {
      const readingLine = 120
      const visibleSection = sections.reduce<string>((current, section) => {
        const element = document.getElementById(section.id)
        return element && element.getBoundingClientRect().top <= readingLine ? section.id : current
      }, "overview")
      setActiveSection((current) => current === visibleSection ? current : visibleSection)
    }

    updateActiveSection()
    window.addEventListener("scroll", updateActiveSection, { passive: true })
    window.addEventListener("resize", updateActiveSection)
    return () => {
      window.removeEventListener("scroll", updateActiveSection)
      window.removeEventListener("resize", updateActiveSection)
    }
  }, [])

  return (
    <MarketplaceShell>
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 px-2.5 py-0.5 text-primary border-primary/20">
            <Sparkles className="size-3" />
            Documentation
          </Badge>
          <span className="text-xs text-muted-foreground">v0.2 · Base Sepolia · x402</span>
        </div>
        <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-[-0.04em]">
          SkillsBay Architecture & Integration Guide
        </h1>
        <p className="mt-3 max-w-3xl text-base text-muted-foreground leading-relaxed">
          Everything you need to know about SkillsBay — how agent payments work via HTTP 402, smart
          contract registry settlement, agent runtime integrations, and publishing paid private skills.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Sticky Desktop Navigation */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-1 text-sm">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contents
            </p>
            {sections.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id)
                    document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" })
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </button>
              )
            })}

            <div className="pt-6">
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 text-xs text-muted-foreground space-y-2">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  Live Registry
                </div>
                <p className="leading-snug">
                  Smart contract registry deployed on Base Sepolia with instant 95/5 USDC revenue splits.
                </p>
                <Link
                  to="/dashboard/skills/new"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline pt-1"
                >
                  Publish a skill <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Documentation Content */}
        <div className="space-y-16">
          {/* 1. Overview */}
          <section id="overview" className="scroll-mt-24 space-y-6">
            <div className="border-b pb-4">
              <h2 className="text-2xl font-semibold tracking-tight">1. Overview</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                What is SkillsBay and why do autonomous AI agents need paid package management?
              </p>
            </div>

            <div className="prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed text-muted-foreground space-y-4">
              <p>
                <strong className="text-foreground">SkillsBay</strong> is a Web3-native package manager
                and marketplace specifically built for <strong className="text-foreground">paid AI agent skills</strong>.
                AI coding agents (like Claude Code, Cursor, Codex, OpenClaw, and Gemini CLI) enhance their capabilities
                using structured <code className="text-foreground font-mono">SKILL.md</code> instruction files, APIs, and workflows.
              </p>
              <p>
                Until SkillsBay, skill distribution was either purely open source or locked behind complex manual subscriptions.
                SkillsBay bridges autonomous agents with crypto-native payments:
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-border/80 bg-muted/20">
                <CardHeader className="pb-2">
                  <Coins className="size-5 text-primary" />
                  <CardTitle className="text-base font-semibold">Pay-Per-Skill in USDC</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground leading-relaxed">
                  Agents or developers pay once in USDC. No monthly subscriptions or API key friction.
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-muted/20">
                <CardHeader className="pb-2">
                  <Zap className="size-5 text-amber-500" />
                  <CardTitle className="text-base font-semibold">x402 Protocol Gate</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground leading-relaxed">
                  Leverages standard HTTP 402 Payment Required challenges so autonomous agents can self-fund and install.
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-muted/20">
                <CardHeader className="pb-2">
                  <Server className="size-5 text-emerald-500" />
                  <CardTitle className="text-base font-semibold">Universal Compatibility</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground leading-relaxed">
                  Installs cleanly to Claude Code, Cursor, Codex, OpenClaw, Antigravity, and universal directories.
                </CardContent>
              </Card>
            </div>
          </section>

          {/* 2. How It Works */}
          <section id="how-it-works" className="scroll-mt-24 space-y-6">
            <div className="border-b pb-4">
              <h2 className="text-2xl font-semibold tracking-tight">2. How It Works</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                End-to-end flow from discovery to private bundle delivery.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/20 p-5 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Workflow className="size-4 text-primary" /> The 5-Step Lifecycle
              </h3>
              <ol className="relative border-l border-border/80 ml-3 space-y-6 text-sm">
                <li className="ml-6">
                  <span className="absolute -left-3 flex size-6 items-center justify-center rounded-full bg-primary/20 text-primary ring-4 ring-background text-xs font-bold">
                    1
                  </span>
                  <h4 className="font-semibold text-foreground">Author Publishes a Skill</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    An author signs in with Privy, claims their permanent publisher username, calls{" "}
                    a skill is registered on Base Sepolia, and its private <code className="text-foreground font-mono">SKILL.md</code> bundle is published to SkillsBay.
                  </p>
                </li>

                <li className="ml-6">
                  <span className="absolute -left-3 flex size-6 items-center justify-center rounded-full bg-primary/20 text-primary ring-4 ring-background text-xs font-bold">
                    2
                  </span>
                  <h4 className="font-semibold text-foreground">Agent Requests Content (HTTP 402)</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    The agent or developer executes <code className="text-foreground font-mono"><CommandText text="npx skillsbay add <author>/<skill>" /></code>.
                    SkillsBay presents an HTTP 402 challenge with the required USDC payment details.
                  </p>
                </li>

                <li className="ml-6">
                  <span className="absolute -left-3 flex size-6 items-center justify-center rounded-full bg-primary/20 text-primary ring-4 ring-background text-xs font-bold">
                    3
                  </span>
                  <h4 className="font-semibold text-foreground">x402 Facilitator Settlement</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    The CLI signs an EVM payment payload using its agent wallet or interactive web checkout. The x402 facilitator
                    verifies funds and settles the USDC payment into the SkillRegistry contract.
                  </p>
                </li>

                <li className="ml-6">
                  <span className="absolute -left-3 flex size-6 items-center justify-center rounded-full bg-primary/20 text-primary ring-4 ring-background text-xs font-bold">
                    4
                  </span>
                  <h4 className="font-semibold text-foreground">On-Chain Entitlement & Revenue Split</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    The registry records the purchase and grants access. The payment is split immediately: 95% goes directly to the author’s wallet and 5% supports the protocol.
                  </p>
                </li>

                <li className="ml-6">
                  <span className="absolute -left-3 flex size-6 items-center justify-center rounded-full bg-primary/20 text-primary ring-4 ring-background text-xs font-bold">
                    5
                  </span>
                  <h4 className="font-semibold text-foreground">Private Delivery & Native Agent Placement</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    SkillsBay verifies entitlement and delivers the private bundle to the CLI.
                    The CLI automatically places the skill into detected agent directories (e.g., <code className="text-foreground font-mono">.agents/skills/</code> or <code className="text-foreground font-mono">.claude/skills/</code>).
                  </p>
                </li>
              </ol>
            </div>

            {/* Architecture Diagram Box */}
            <div className="rounded-xl border border-border/80 bg-muted/40 p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Layers className="size-4 text-primary" /> Protocol Architecture Flow
              </h3>
              <div className="grid gap-3 sm:grid-cols-4 text-xs font-mono">
                <div className="rounded-lg border bg-background/80 p-3 space-y-1">
                  <span className="text-[10px] text-primary uppercase font-bold">Client Layer</span>
                  <div className="font-semibold text-foreground">SkillsBay CLI</div>
                  <p className="text-[11px] text-muted-foreground"><CommandText text="npx skillsbay add" /></p>
                  <p className="text-[11px] text-muted-foreground">Interactive prompt / --wallet env</p>
                </div>
                <div className="rounded-lg border bg-background/80 p-3 space-y-1">
                  <span className="text-[10px] text-amber-500 uppercase font-bold">Access Layer</span>
                  <div className="font-semibold text-foreground">SkillsBay Access Service</div>
                  <p className="text-[11px] text-muted-foreground">x402 payment challenge</p>
                  <p className="text-[11px] text-muted-foreground">Private entitlement delivery</p>
                </div>
                <div className="rounded-lg border bg-background/80 p-3 space-y-1">
                  <span className="text-[10px] text-emerald-500 uppercase font-bold">Execution Layer</span>
                  <div className="font-semibold text-foreground">Circle Paymaster</div>
                  <p className="text-[11px] text-muted-foreground">USDC gas sponsorship</p>
                  <p className="text-[11px] text-muted-foreground">Reliable settlement operations</p>
                </div>
                <div className="rounded-lg border bg-background/80 p-3 space-y-1">
                  <span className="text-[10px] text-sky-500 uppercase font-bold">Settlement Layer</span>
                  <div className="font-semibold text-foreground">SkillRegistry (Base)</div>
                  <p className="text-[11px] text-muted-foreground">95% author / 5% treasury</p>
                  <p className="text-[11px] text-muted-foreground">The Graph indexing</p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. CLI Guide */}
          <section id="cli-guide" className="scroll-mt-24 space-y-6">
            <div className="border-b pb-4">
              <h2 className="text-2xl font-semibold tracking-tight">3. CLI & Installation Commands</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Command-line interface reference for developers and autonomous agents.
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              You can run the CLI without prior installation using <code className="text-foreground font-mono">npx</code>,
              or install it globally using your favorite package manager.
            </p>

            <Tabs defaultValue="add" className="w-full">
              <TabsList className="grid w-full grid-cols-4 max-w-md">
                <TabsTrigger value="add">add</TabsTrigger>
                <TabsTrigger value="info">info</TabsTrigger>
                <TabsTrigger value="search">search</TabsTrigger>
                <TabsTrigger value="list">list / rm</TabsTrigger>
              </TabsList>

              <TabsContent value="add" className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Purchases and installs a skill from the marketplace. If running in a human terminal without a wallet key,
                  it offers a 1-click browser checkout. If running inside an agent with an environment key, it pays automatically.
                </p>
                <CodeSnippet
                  caption="Basic Usage"
                  code={`# Purchase and install interactively
npx skillsbay add karapi/substreams-deployer

# Shorthand aliases
npx skillsbay i karapi/substreams-deployer`}
                />
                <CodeSnippet
                  caption="Autonomous Agent Execution (Zero prompts)"
                  code={`# Autonomous mode using agent's funded private key (x402)
SKILLSBAY_PRIVATE_KEY=0x... npx skillsbay add karapi/substreams-deployer --wallet env -y

# Specify target agents explicitly
npx skillsbay add karapi/substreams-deployer -a claude-code,cursor -y

# Install globally across all project directories
npx skillsbay add karapi/substreams-deployer -g -y`}
                />
              </TabsContent>

              <TabsContent value="info" className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Inspect a skill’s metadata, author, price, and version before purchasing.
                </p>
                <CodeSnippet
                  caption="Inspect Skill Info"
                  code={`npx skillsbay info karapi/substreams-deployer

# Output example:
# substreams-deployer
# Author:       karapi
# Price:        $15.00 USDC
# Version:      1.0.0
# Paid Installs: 142
# Description:  Build and deploy Substreams pipelines.`}
                />
              </TabsContent>

              <TabsContent value="search" className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Query the live marketplace registry directly from your terminal.
                </p>
                <CodeSnippet
                  caption="Search Marketplace"
                  code={`# Search for Substreams or Graph skills
npx skillsbay search substreams

# Search for trading or DeFi skills
npx skillsbay search defi`}
                />
              </TabsContent>

              <TabsContent value="list" className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Audit and manage already installed skills across all detected agent folders.
                </p>
                <CodeSnippet
                  caption="List & Remove"
                  code={`# List all installed skills across all agent environments
npx skillsbay list

# Remove an installed skill
npx skillsbay remove substreams-deployer`}
                />
              </TabsContent>
            </Tabs>

            {/* Flags table */}
            <div className="overflow-x-auto rounded-xl border border-border/80">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="p-3 font-semibold">Flag</th>
                    <th className="p-3 font-semibold">Type</th>
                    <th className="p-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr>
                    <td className="p-3 font-mono text-primary font-medium">-y, --yes</td>
                    <td className="p-3 text-muted-foreground">boolean</td>
                    <td className="p-3 text-foreground/90">Skip interactive confirmations and prompt dialogs.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-primary font-medium">--wallet &lt;mode&gt;</td>
                    <td className="p-3 text-muted-foreground">auto | env</td>
                    <td className="p-3 text-foreground/90">
                      Choose payment mechanism. <code className="font-mono">env</code> signs using <code className="font-mono">SKILLSBAY_PRIVATE_KEY</code>; <code className="font-mono">auto</code> falls back to browser if not headless.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-primary font-medium">-a, --agent</td>
                    <td className="p-3 text-muted-foreground">string</td>
                    <td className="p-3 text-foreground/90">Comma-separated target agents (e.g. <code className="font-mono">claude-code,cursor</code>).</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-primary font-medium">-g, --global</td>
                    <td className="p-3 text-muted-foreground">boolean</td>
                    <td className="p-3 text-foreground/90">Installs to user-level home directories instead of project folder.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-primary font-medium">-f, --force</td>
                    <td className="p-3 text-muted-foreground">boolean</td>
                    <td className="p-3 text-foreground/90">Overwrite existing local skill file if already present.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. Agent Integrations */}
          <section id="integrations" className="scroll-mt-24 space-y-6">
            <div className="border-b pb-4">
              <h2 className="text-2xl font-semibold tracking-tight">4. Supported Agent Integrations</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                SkillsBay natively detects and links skills into the canonical directories of modern agent frameworks.
              </p>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              When a skill bundle is delivered, SkillsBay inspects your workspace and system configuration to detect
              which AI tools you run. It links the canonical skill file so your agents immediately gain access without reloading.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-border/80">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Claude Code / Anthropic</CardTitle>
                    <Badge variant="outline" className="text-[10px]">Project & Global</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Target directory: <code className="font-mono text-foreground">.claude/skills/&lt;skill&gt;/SKILL.md</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
                  <p>Full support for Claude Code CLI and Anthropic subagents. Installs directly to the workspace config or user global <code className="font-mono">~/.claude/skills</code>.</p>
                </CardContent>
              </Card>

              <Card className="border-border/80">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Cursor & Cursor CLI</CardTitle>
                    <Badge variant="outline" className="text-[10px]">Project & Global</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Target directory: <code className="font-mono text-foreground">.cursor/skills/</code> or <code className="font-mono">.agents/skills/</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
                  <p>Automatically detected during Cursor terminal sessions and Agent mode runs. Context is injected into composer sessions.</p>
                </CardContent>
              </Card>

              <Card className="border-border/80">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Google Antigravity & Gemini</CardTitle>
                    <Badge variant="outline" className="text-[10px]">Workspace & Global</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Target directory: <code className="font-mono text-foreground">.agents/skills/&lt;name&gt;/SKILL.md</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
                  <p>Compatible with Antigravity 2.0 skills engine and Gemini CLI assistant tooling.</p>
                </CardContent>
              </Card>

              <Card className="border-border/80">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">OpenClaw / Codex / Universal</CardTitle>
                    <Badge variant="outline" className="text-[10px]">Open Standard</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Target directory: <code className="font-mono text-foreground">.agents/skills/</code> or <code className="font-mono">~/.openclaw/skills/</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
                  <p>Uses the standardized agent skill layout supported by OpenClaw, Moltbot, Clawdbot, Codex, and generic LLM orchestrators.</p>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-xs text-muted-foreground space-y-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-500" /> Symlinked Canonical Storage
              </span>
              <p>
                Skills are stored once in the canonical <code className="font-mono text-foreground">.skills/&lt;skill&gt;</code> directory and symlinked into each agent folder.
                This prevents duplication and ensures updates propagate across all environments instantly.
              </p>
            </div>
          </section>

          {/* 5. Web3 Stack & x402 */}
          <section id="web3-stack" className="scroll-mt-24 space-y-6">
            <div className="border-b pb-4">
              <h2 className="text-2xl font-semibold tracking-tight">5. Web3 Partners & Payment Standard</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The partner services that make paid, agent-native skill distribution possible.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="border-border/80 bg-muted/20"><CardHeader className="pb-2"><Coins className="size-5 text-primary" /><CardTitle className="text-base">Base</CardTitle></CardHeader><CardContent className="text-xs leading-relaxed text-muted-foreground">The settlement network for skill registration, permanent access receipts, and direct USDC revenue splits.</CardContent></Card>
              <Card className="border-border/80 bg-muted/20"><CardHeader className="pb-2"><Server className="size-5 text-emerald-500" /><CardTitle className="text-base">The Graph</CardTitle></CardHeader><CardContent className="text-xs leading-relaxed text-muted-foreground">Indexes marketplace activity for discovery, trending skills, author earnings, and purchase analytics.</CardContent></Card>
              <Card className="border-border/80 bg-muted/20"><CardHeader className="pb-2"><ShieldCheck className="size-5 text-violet-500" /><CardTitle className="text-base">Privy</CardTitle></CardHeader><CardContent className="text-xs leading-relaxed text-muted-foreground">Lets authors sign in with familiar methods, receive an embedded wallet, and publish or manage skills.</CardContent></Card>
              <Card className="border-border/80 bg-muted/20"><CardHeader className="pb-2"><Zap className="size-5 text-amber-500" /><CardTitle className="text-base">x402</CardTitle></CardHeader><CardContent className="text-xs leading-relaxed text-muted-foreground">Provides the HTTP payment challenge that lets funded agents pay for a missing capability on demand.</CardContent></Card>
              <Card className="border-border/80 bg-muted/20"><CardHeader className="pb-2"><Layers className="size-5 text-sky-500" /><CardTitle className="text-base">Circle Paymaster</CardTitle></CardHeader><CardContent className="text-xs leading-relaxed text-muted-foreground">Sponsors settlement operations with USDC gas, keeping the payment flow reliable without exposing infrastructure details.</CardContent></Card>
            </div>
          </section>

          {/* 6. For Authors */}
          <section id="for-authors" className="scroll-mt-24 space-y-6">
            <div className="border-b pb-4">
              <h2 className="text-2xl font-semibold tracking-tight">6. Author Publishing Guide</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                How to monetize your agent workflows and publish private skills in minutes.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/20 text-primary font-bold text-xs">
                  1
                </div>
                <h4 className="text-sm font-semibold text-foreground">Connect with Privy</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sign in with email, social, or passkeys. Privy automatically deploys an embedded wallet on Base Sepolia.
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/20 text-primary font-bold text-xs">
                  2
                </div>
                <h4 className="text-sm font-semibold text-foreground">Claim Your Namespace</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Claim your unique publisher handle (e.g., <code className="font-mono text-foreground">karapi</code>). It is tied cryptographically to your wallet.
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/20 text-primary font-bold text-xs">
                  3
                </div>
                <h4 className="text-sm font-semibold text-foreground">Set Price & Publish</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Draft your <code className="font-mono text-foreground">SKILL.md</code>, set your USDC price, and submit. Payouts arrive directly at your Privy wallet.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Recommended SKILL.md Frontmatter</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Agent skill files should include valid YAML frontmatter so LLMs can self-index tools and triggers.
              </p>
              <CodeSnippet
                caption="SKILL.md Template"
                code={`---
name: substreams-deployer
description: Build, validate, and stream real-time blockchain data pipelines with Substreams.
version: 1.0.0
tags: [blockchain, the-graph, substreams, indexing]
---

# Substreams Deployer

Instructions for the AI agent to orchestrate Substreams deployments...`}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-5">
              <div>
                <h4 className="font-semibold text-foreground text-sm">Ready to monetize your agent skills?</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Publishing takes under 2 minutes. Earn 95% of every single purchase.
                </p>
              </div>
              <Link
                to="/dashboard/skills/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Publish now <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </MarketplaceShell>
  )
}
