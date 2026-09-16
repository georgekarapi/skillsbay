import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Lock, LockKeyhole } from "lucide-react";
import {
  createPublicClient,
  encodeFunctionData,
  http,
  keccak256,
  parseAbi,
  stringToHex,
} from "viem";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthorAuth } from "@/components/providers/author-auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getAuthorProfile,
  MarketplaceApiError,
  publishBundle,
} from "@/lib/marketplace-api";
import { MarketplaceShell } from "@/components/templates/marketplace-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SKILL_CATEGORIES } from "@/types/marketplace";
import { createPublishAuthorizationMessage } from "@skillsbay/shared/publish-authorization";
import { baseNetwork } from "@/lib/base-network";

const registryAbi = parseAbi([
  "function registerSkill(bytes32 skillId, uint96 price, uint32 majorVersion, string metadataURI)",
]);
const initialMarkdown =
  "---\nname: substreams-deployer\ndescription: Build and deploy Substreams pipelines.\n---\n\n# Substreams Deployer\n\n";
const skillNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseUsdc(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value))
    throw new Error("Enter a USDC price with up to 2 decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const amount =
    BigInt(whole) * 1_000_000n + BigInt((fraction + "000000").slice(0, 6));
  if (amount < 200_000n) throw new Error("Price must be at least $0.20 USDC.");
  if (amount > 2n ** 96n - 1n) throw new Error("Enter a valid USDC price.");
  return amount;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function PublishSkillPage() {
  const author = useAuthorAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("15.00");
  const [category, setCategory] = useState<string>("Agent tooling");
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [publishing, setPublishing] = useState(false);
  const registryAddress = import.meta.env.VITE_SKILL_REGISTRY_ADDRESS as
    | string
    | undefined;
  const profile = useQuery({
    queryKey: ["author-profile", author.walletAddress],
    queryFn: () => getAuthorProfile(author.walletAddress!),
    enabled: Boolean(author.walletAddress),
  });
  const namespace = profile.data?.username;
  const canPublish = Boolean(
    author.authenticated &&
    author.walletAddress &&
    author.signMessage &&
    author.sendTransaction &&
    registryAddress &&
    namespace,
  );

  if (author.configured && !author.ready) {
    return (
      <MarketplaceShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </MarketplaceShell>
    );
  }

  if (!author.authenticated) {
    return (
      <MarketplaceShell>
        <Link
          className="mb-7 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          to="/dashboard"
        >
          <ArrowLeft className="size-4" /> For authors
        </Link>
        <div className="mx-auto max-w-md py-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-border/80 bg-card shadow-xs text-primary">
            <Lock className="size-5" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            Sign in to publish
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Connect to claim your namespace handle and publish skills to the
            registry.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3">
            <Button
              size="default"
              className="h-10 gap-2 px-5 text-sm font-medium shadow-xs"
              onClick={author.login}
            >
              Get started
              <ArrowRight className="size-3.5" />
            </Button>
            <p className="text-xs text-muted-foreground">
              Sign in with email, Google, or passkey. No seed phrases needed.
            </p>
          </div>
        </div>
      </MarketplaceShell>
    );
  }

  async function uploadAfterConfirmation(input: {
    skillId: string;
    markdown: string;
    authorAddress: string;
  }) {
    const issuedAt = new Date().toISOString();
    const contentSha256 = await sha256Hex(input.markdown);
    const message = createPublishAuthorizationMessage({
      skillId: input.skillId,
      author: input.authorAddress,
      contentSha256,
      issuedAt,
    });
    const signature = await author.signMessage!(message);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        await publishBundle({
          skillId: input.skillId,
          author: input.authorAddress,
          contentSha256,
          issuedAt,
          markdown: input.markdown,
          signature,
          category,
        });
        return;
      } catch (error) {
        if (
          !(error instanceof MarketplaceApiError) ||
          error.code !== "SKILL_NOT_REGISTERED" ||
          attempt === 19
        )
          throw error;
        await delay(2_000);
      }
    }
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!author.authenticated) return author.login();
    if (!namespace) return;
    if (!canPublish || !registryAddress || !author.walletAddress) return;
    const normalizedNamespace = namespace;
    const normalizedSlug = title.trim().toLowerCase();
    if (
      !skillNamePattern.test(normalizedNamespace) ||
      !skillNamePattern.test(normalizedSlug)
    ) {
      toast.error(
        "Use lowercase letters, numbers, and hyphens only—no spaces.",
      );
      return;
    }
    if (!markdown.startsWith("---")) {
      toast.error("SKILL.md needs YAML frontmatter beginning with ---.");
      return;
    }
    const version = 1;
    let amount: bigint;
    try {
      amount = parseUsdc(price.trim());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid price.");
      return;
    }
    const skillId = `${normalizedNamespace}/${normalizedSlug}`;
    setPublishing(true);
    try {
      const data = encodeFunctionData({
        abi: registryAbi,
        functionName: "registerSkill",
        args: [
          keccak256(stringToHex(skillId)),
          amount,
          version,
          `skillsbay://${skillId}`,
        ],
      });
      const transaction = await author.sendTransaction!({
        to: registryAddress,
        data,
        chainId: baseNetwork.chainId,
      });
      toast.success("Registration submitted", {
        description: `${transaction.hash.slice(0, 10)}…${transaction.hash.slice(-8)}`,
      });
      const confirmationClient = createPublicClient({
        chain: baseNetwork.chain,
        transport: http(baseNetwork.rpcUrl),
      });
      const receipt = await confirmationClient.waitForTransactionReceipt({
        hash: transaction.hash,
        confirmations: 1,
      });
      if (receipt.status === "reverted") {
        throw new Error(`The registry transaction reverted on ${baseNetwork.name}.`);
      }
      await uploadAfterConfirmation({
        skillId,
        markdown,
        authorAddress: author.walletAddress,
      });
      toast.success("Skill published", {
        description: "The encrypted bundle is ready for x402 installs.",
      });
      navigate("/dashboard");
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Please try again.";
      toast.error("Skill was not published", { description });
    } finally {
      setPublishing(false);
    }
  }

  const submitLabel = publishing
    ? "Publishing…"
    : !author.authenticated
      ? "Connect Privy to publish"
      : !namespace
        ? "Choose username to publish"
        : !registryAddress
          ? "Set VITE_SKILL_REGISTRY_ADDRESS"
          : !author.walletAddress
            ? "Creating embedded wallet…"
            : !author.signMessage || !author.sendTransaction
              ? "Preparing Privy wallet…"
              : "Register & publish";
  const generatedSlug = title.trim().toLowerCase();
  return (
    <MarketplaceShell>
      <Link
        className="mb-7 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        to="/dashboard"
      >
        <ArrowLeft className="size-4" /> Author dashboard
      </Link>
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
          New skill
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">
          Publish a single SKILL.md
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Your embedded wallet registers metadata on-chain, then signs the
          encrypted bundle upload to Skillsbay.
        </p>
        <Card className="mt-7">
          <CardHeader>
            <CardTitle>Skill details</CardTitle>
            <CardDescription>
              Published as{" "}
              <span className="font-mono">
                {namespace ?? (profile.isLoading ? "…" : "your-username")}/
                {generatedSlug || "skill-title"}
              </span>{" "}
              · starts at version 1.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5" onSubmit={publish}>
              <label className="grid gap-2 text-sm font-medium">
                Skill title
                <Input
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value.toLowerCase())
                  }
                  placeholder="substreams-deployer"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  autoCapitalize="none"
                  required
                />
                <span className="text-xs font-normal text-muted-foreground">
                  Lowercase letters, numbers, and hyphens only. Spaces are not
                  allowed.
                </span>
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  Price (USDC)
                  <Input
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    inputMode="decimal"
                    min="0.20"
                    step="0.01"
                    required
                  />
                  <span className="text-xs font-normal text-muted-foreground">
                    Minimum $0.20
                  </span>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Category
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs font-normal text-muted-foreground">
                    Appears in discovery &amp; social cards
                  </span>
                </label>
              </div>
              <label className="grid gap-2 text-sm font-medium">
                SKILL.md
                <Textarea
                  className="min-h-72 font-mono text-xs leading-5"
                  value={markdown}
                  onChange={(event) => setMarkdown(event.target.value)}
                  required
                />
              </label>
              <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <LockKeyhole className="size-3.5" /> One encrypted bundle ·
                  95% author royalty
                </div>
                <Button
                  disabled={
                    publishing ||
                    (author.authenticated && Boolean(namespace) && !canPublish)
                  }
                  type="submit"
                >
                  {submitLabel}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MarketplaceShell>
  );
}
