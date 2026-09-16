import { useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  Check,
  Copy,
  FileCode2,
  Lock,
  Receipt,
  Terminal,
} from "lucide-react"
import { toast } from "sonner"
import { useAuthorAuth } from "@/components/providers/author-auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CommandText } from "@/components/molecules/command-text"

const SAMPLE_SKILL_MD = `---
name: substreams-deployer
description: Build, validate, and stream blockchain data pipelines.
version: 1.0.0
tags: [the-graph, blockchain, substreams]
---

# Substreams Deployer

Instructions for the AI agent to compile manifest files, validate
protobuf schemas, and initiate streaming sinks...`

const CLI_PUBLISH_COMMAND = `npx skillsbay publish ./SKILL.md --price 0.50`

const SAMPLE_RECEIPT = `{
  "skillId": "thegraph/substreams-deployer",
  "buyer": "0x14f2…89a1",
  "price": "0.50 USDC",
  "settlement": {
    "authorPayout": "0.475 USDC (95%)",
    "protocolFee": "0.025 USDC (5%)",
    "network": "Base",
    "protocol": "x402"
  },
  "verified": true
}`

const SPECS = [
  { label: "Royalty split", value: "95% author / 5% protocol fee" },
  { label: "Settlement asset", value: "USDC on Base" },
  { label: "Access protocol", value: "HTTP 402 Payment Required (x402)" },
  { label: "Payload delivery", value: "Private R2 delivery, receipt-verified" },
  { label: "Minimum price", value: "0.20 USDC" },
  { label: "Author identity", value: "Privy embedded wallet + handle" },
]

const STEPS = [
  {
    step: "01",
    title: "Claim handle",
    description: "Sign in with Privy using email or passkey. Your embedded wallet is created instantly, letting you reserve your cryptographic @handle.",
  },
  {
    step: "02",
    title: "Upload & set price",
    description: "Write your SKILL.md with standard YAML frontmatter. Set your USDC price (starts at $0.20) and sign the on-chain registry entry.",
  },
  {
    step: "03",
    title: "Earn 95% per install",
    description: "When an agent invokes your skill, it receives an x402 challenge and settles via USDC. 95% is routed directly to your address.",
  },
]

export function ForAuthorsLanding() {
  const author = useAuthorAuth()
  const [activeTab, setActiveTab] = useState<"skill" | "cli" | "receipt">("skill")
  const [copied, setCopied] = useState(false)

  const activeContent =
    activeTab === "skill"
      ? SAMPLE_SKILL_MD
      : activeTab === "cli"
        ? CLI_PUBLISH_COMMAND
        : SAMPLE_RECEIPT

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(activeContent)
      setCopied(true)
      toast.success("Copied to clipboard")
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error("Could not copy")
    }
  }

  const handleStartPublishing = () => {
    if (author.authenticated) return
    author.login()
  }

  return (
    <div className="space-y-12 py-2 sm:py-6">
      {/* Hero Section */}
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center">
        <div className="flex flex-col items-start">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
            For Authors
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl lg:text-[2.6rem] lg:leading-[1.15]">
            <span>Ship private skills.</span>{" "}
            <span className="block font-normal text-muted-foreground">
              Keep control of every release.
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            Publish versioned private{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">SKILL.md</code>{" "}
            bundles, set a USDC price, and deliver the exact release only after
            a buyer's entitlement is confirmed.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="default" className="h-10 gap-2 px-5 text-sm font-medium shadow-xs" onClick={handleStartPublishing}>
              Get started
              <ArrowRight className="size-3.5" />
            </Button>

            <Button asChild variant="outline" size="default" className="h-10 px-4 text-sm font-medium">
              <Link to="/docs#for-authors">Documentation</Link>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1 rounded-full bg-primary" />
              Versioned releases
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1 rounded-full bg-primary" />
              Private bundle delivery
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1 rounded-full bg-primary" />
              95% USDC creator split
            </span>
          </div>
        </div>

        {/* Terminal / Code Inspection Card */}
        <div className="w-full">
          <div className="rounded-xl border border-border/80 bg-card/95 shadow-xs transition-all hover:border-border">
            {/* Window Header */}
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <div className="size-2.5 rounded-full bg-border" />
                <div className="size-2.5 rounded-full bg-border" />
                <div className="size-2.5 rounded-full bg-border" />
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("skill")}
                  className={`flex items-center gap-1 rounded px-2 py-0.5 font-mono text-xs transition-colors ${
                    activeTab === "skill"
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileCode2 className="size-3" />
                  SKILL.md
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("cli")}
                  className={`flex items-center gap-1 rounded px-2 py-0.5 font-mono text-xs transition-colors ${
                    activeTab === "cli"
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Terminal className="size-3" />
                  publish.sh
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("receipt")}
                  className={`flex items-center gap-1 rounded px-2 py-0.5 font-mono text-xs transition-colors ${
                    activeTab === "receipt"
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Receipt className="size-3" />
                  receipt.json
                </button>
              </div>

              <button
                type="button"
                onClick={copyContent}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Copy content"
                aria-label="Copy content"
              >
                {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              </button>
            </div>

            {/* Code Body */}
            <div className="p-4 font-mono text-xs leading-relaxed text-foreground/90">
              <pre className="max-h-72 overflow-auto font-mono text-xs">
                <code>
                  {activeTab === "cli" ? (
                    <CommandText text={activeContent} />
                  ) : (
                    activeContent
                  )}
                </code>
              </pre>
            </div>

            {/* Footer status line */}
            <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground font-mono">
              <span className="flex items-center gap-1.5">
                <Lock className="size-3 text-emerald-600 dark:text-emerald-400" />
                x402 protected
              </span>
              <span>Base · USDC</span>
            </div>
          </div>
        </div>
      </section>

      {/* Specifications Grid */}
      <section className="space-y-4 border-t pt-8">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Protocol specifications
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SPECS.map((spec) => (
            <div
              key={spec.label}
              className="rounded-lg border border-border/80 bg-card/60 p-3.5"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {spec.label}
              </p>
              <p className="mt-1 font-mono text-xs font-semibold text-foreground">
                {spec.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works: 3 Steps */}
      <section className="space-y-4 border-t pt-8">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">How it works</h2>
          <p className="text-xs text-muted-foreground">
            From local draft to on-chain monetization in three steps.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((item) => (
            <Card key={item.step} className="border-border/80 bg-card/60">
              <CardHeader className="pb-2">
                <span className="font-mono text-xs font-semibold text-primary">
                  {item.step}
                </span>
                <CardTitle className="text-sm font-semibold">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Consumption Example for Agents */}
      <section className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">How agents install your skill</h3>
            <p className="text-xs text-muted-foreground">
              Funded agent runtimes add your skill via the Skillsbay CLI or direct x402 HTTP requests.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText("npx skillsbay add your-handle/skill-name")
              toast.success("Command copied to clipboard")
            }}
            className="group flex items-center gap-2 rounded bg-background px-3 py-1.5 font-mono text-xs border border-border/70 text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 cursor-pointer"
            title="Click to copy"
          >
            <code>
              <CommandText text="npx skillsbay add your-handle/skill-name" />
            </code>
            <Copy className="size-3 text-muted-foreground transition-colors group-hover:text-foreground" />
          </button>
        </div>
      </section>

      {/* Bottom Minimalist CTA */}
      <section className="rounded-xl border border-border/80 bg-card/70 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Ready to publish?
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Sign in with your email or passkey to claim your publisher namespace.
            </p>
          </div>
          <Button onClick={handleStartPublishing} className="h-10 gap-2 px-5 text-sm font-medium shrink-0">
            Get started
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </section>
    </div>
  )
}
