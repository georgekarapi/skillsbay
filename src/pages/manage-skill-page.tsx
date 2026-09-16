import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CircleDollarSign,
  Lock,
  Pencil,
  Save,
} from "lucide-react";
import { encodeFunctionData, keccak256, parseAbi, stringToHex } from "viem";
import { Link, useParams } from "react-router-dom";
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
  getAuthorBundle,
  getMarketplaceSkills,
  publishBundle,
} from "@/lib/marketplace-api";
import { MarketplaceShell } from "@/components/templates/marketplace-shell";
import { baseNetwork } from "@/lib/base-network";
import {
  createBundleReadAuthorizationMessage,
  createPublishAuthorizationMessage,
} from "@skillsbay/shared/publish-authorization";

const registryAbi = parseAbi([
  "function updateSkill(bytes32 skillId, uint96 price, bool active, string metadataURI)",
]);

type DiffLine = { kind: "same" | "added" | "removed"; value: string };

function parseUsdc(value: string) {
  if (!/^\d+(?:\.\d{1,6})?$/.test(value))
    throw new Error("Enter a USDC price with up to six decimals.");
  const [whole, fraction = ""] = value.split(".");
  const amount =
    BigInt(whole) * 1_000_000n + BigInt((fraction + "000000").slice(0, 6));
  if (amount <= 0n || amount > 2n ** 96n - 1n)
    throw new Error("Enter a valid positive USDC price.");
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

function skillMarkdown(skillId: string) {
  const title =
    skillId
      .split("/")
      .at(-1)
      ?.split("-")
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join(" ") ?? "Skill";
  return `---\nname: ${skillId.split("/").at(-1)}\ndescription: ${title} for production AI-agent workflows.\n---\n\n# ${title}\n\n## When to use this skill\n\nUse this skill when an agent needs the workflow described above.\n\n## Instructions\n\nFollow the implementation checklist and verify the final output.\n`;
}

function lineDiff(before: string, after: string): DiffLine[] {
  const previous = before.split("\n");
  const next = after.split("\n");
  const matrix = Array.from({ length: previous.length + 1 }, () =>
    Array<number>(next.length + 1).fill(0),
  );
  for (let row = previous.length - 1; row >= 0; row -= 1)
    for (let column = next.length - 1; column >= 0; column -= 1)
      matrix[row][column] =
        previous[row] === next[column]
          ? matrix[row + 1][column + 1] + 1
          : Math.max(matrix[row + 1][column], matrix[row][column + 1]);
  const output: DiffLine[] = [];
  let row = 0;
  let column = 0;
  while (row < previous.length && column < next.length) {
    if (previous[row] === next[column]) {
      output.push({ kind: "same", value: previous[row] });
      row += 1;
      column += 1;
    } else if (matrix[row + 1][column] >= matrix[row][column + 1]) {
      output.push({ kind: "removed", value: previous[row] });
      row += 1;
    } else {
      output.push({ kind: "added", value: next[column] });
      column += 1;
    }
  }
  while (row < previous.length) {
    output.push({ kind: "removed", value: previous[row] });
    row += 1;
  }
  while (column < next.length) {
    output.push({ kind: "added", value: next[column] });
    column += 1;
  }
  return output;
}

export function ManageSkillPage() {
  const { namespace, slug } = useParams();
  const skillId = `${namespace}/${slug}`;
  const author = useAuthorAuth();
  const marketplace = useQuery({
    queryKey: ["marketplace-skills"],
    queryFn: getMarketplaceSkills,
  });
  const skill = marketplace.data?.skills.find((item) => item.id === skillId);
  const [price, setPrice] = useState(skill?.priceUsdc ?? "0.25");
  const [savedMarkdown, setSavedMarkdown] = useState(() =>
    skill ? skillMarkdown(skill.id) : "",
  );
  const [markdown, setMarkdown] = useState(() =>
    skill ? skillMarkdown(skill.id) : "",
  );
  const [editMode, setEditMode] = useState(false);
  const [loadingEditor, setLoadingEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const registryAddress = import.meta.env.VITE_SKILL_REGISTRY_ADDRESS as
    | string
    | undefined;
  const canSave = Boolean(
    author.authenticated &&
    author.walletAddress &&
    author.signMessage &&
    author.sendTransaction &&
    registryAddress,
  );
  const lines = useMemo(
    () => lineDiff(savedMarkdown, markdown),
    [savedMarkdown, markdown],
  );
  const hasMarkdownChanges = savedMarkdown !== markdown;
  const generatedRevenue = skill
    ? (Number(skill.priceUsdc) * skill.paidInstalls * 0.95).toFixed(2)
    : "0.00";
  const installsByDay = [42, 67, 58, 91, 84, 112, 138];
  const maxInstalls = Math.max(...installsByDay);

  useEffect(() => {
    if (!skill) return;
    const initial = skillMarkdown(skill.id);
    setPrice(skill.priceUsdc);
    setSavedMarkdown(initial);
    setMarkdown(initial);
  }, [skill?.id, skill?.priceUsdc]);

  async function beginEditing() {
    if (!skill) return;
    if (!author.authenticated) return author.login();
    if (!author.walletAddress || !author.signMessage) {
      toast.error("Connect to edit this skill.");
      return;
    }
    setLoadingEditor(true);
    try {
      const issuedAt = new Date().toISOString();
      const signature = await author.signMessage(
        createBundleReadAuthorizationMessage({
          skillId: skill.id,
          author: author.walletAddress,
          issuedAt,
        }),
      );
      const source = await getAuthorBundle({
        skillId: skill.id,
        author: author.walletAddress,
        issuedAt,
        signature,
      });
      setSavedMarkdown(source);
      setMarkdown(source);
      setEditMode(true);
    } catch (error) {
      toast.error("Could not open the encrypted skill", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoadingEditor(false);
    }
  }

  async function uploadBundle() {
    if (!skill) return;
    const issuedAt = new Date().toISOString();
    const contentSha256 = await sha256Hex(markdown);
    const message = createPublishAuthorizationMessage({
      skillId: skill.id,
      author: author.walletAddress!,
      contentSha256,
      issuedAt,
    });
    const signature = await author.signMessage!(message);
    await publishBundle({
      skillId: skill.id,
      author: author.walletAddress!,
      contentSha256,
      issuedAt,
      markdown,
      signature,
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!skill) return;
    if (!author.authenticated) return author.login();
    if (!canSave || !registryAddress) return;
    if (!markdown.startsWith("---")) {
      toast.error("SKILL.md needs YAML frontmatter beginning with ---.");
      return;
    }
    let amount: bigint;
    try {
      amount = parseUsdc(price.trim());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid price.");
      return;
    }
    setSaving(true);
    try {
      const data = encodeFunctionData({
        abi: registryAbi,
        functionName: "updateSkill",
        args: [
          keccak256(stringToHex(skill.id)),
          amount,
          true,
          `skillsbay://${skill.id}`,
        ],
      });
      const transaction = await author.sendTransaction!({
        to: registryAddress,
        data,
        chainId: baseNetwork.chainId,
      });
      toast.success("Update submitted", {
        description: `${transaction.hash.slice(0, 10)}…${transaction.hash.slice(-8)}`,
      });
      if (hasMarkdownChanges) await uploadBundle();
      setSavedMarkdown(markdown);
      toast.success("Skill updated", {
        description: hasMarkdownChanges
          ? "The updated encrypted SKILL.md is ready for new installs."
          : "Price was updated successfully.",
      });
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Please try again.";
      toast.error("Skill was not updated", { description });
    } finally {
      setSaving(false);
    }
  }

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
          <ArrowLeft className="size-4" /> Author dashboard
        </Link>
        <div className="mx-auto max-w-md py-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-border/80 bg-card shadow-xs text-primary">
            <Lock className="size-5" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            Sign in to manage skill
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Connect the author wallet that registered this skill to edit prices
            or update the bundle.
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
          </div>
        </div>
      </MarketplaceShell>
    );
  }

  if (marketplace.isLoading) {
    return (
      <MarketplaceShell>
        <Link
          className="mb-7 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          to="/dashboard"
        >
          <ArrowLeft className="size-4" /> Author dashboard
        </Link>
        <div className="py-16 text-center text-sm text-muted-foreground">
          Loading skill details…
        </div>
      </MarketplaceShell>
    );
  }

  if (!skill) {
    return (
      <MarketplaceShell>
        <Link
          className="mb-7 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          to="/dashboard"
        >
          <ArrowLeft className="size-4" /> Author dashboard
        </Link>
        <div className="rounded-xl border bg-card p-12 text-center">
          <h2 className="text-xl font-semibold">Skill not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The skill “{skillId}” could not be found in the registry.
          </p>
        </div>
      </MarketplaceShell>
    );
  }

  return (
    <MarketplaceShell>
      <Link
        className="mb-7 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        to="/dashboard"
      >
        <ArrowLeft className="size-4" /> Author dashboard
      </Link>
      <div className="flex flex-col gap-3 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            {skill.namespace}/{skill.slug}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            {skill.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your skill details and encrypted SKILL.md bundle.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          <Check className="size-3.5" /> Active
        </span>
      </div>
      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <main className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Skill details</CardTitle>
                  <CardDescription>
                    Current public metadata and delivery settings.
                  </CardDescription>
                </div>
                {!editMode && (
                  <Button disabled={loadingEditor} onClick={beginEditing}>
                    <Pencil />{" "}
                    {loadingEditor ? "Verifying author…" : "Edit skill"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="mt-1 leading-6">{skill.summary}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="mt-1 font-medium">{skill.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Version</p>
                  <p className="mt-1 font-medium">v{skill.version}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current price</p>
                  <p className="mt-1 font-medium">${skill.priceUsdc} USDC</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Bundle identifier
                </p>
                <p className="mt-1 font-mono text-xs">skillsbay://{skill.id}</p>
              </div>
            </CardContent>
          </Card>
          {editMode && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Pencil className="size-4 text-primary" />
                    <CardTitle>Edit skill</CardTitle>
                  </div>
                  <CardDescription>
                    Edit the verified source bundle, then sign once to update.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-5" onSubmit={save}>
                    <label className="grid gap-2 text-sm font-medium">
                      Price (USDC)
                      <Input
                        inputMode="decimal"
                        onChange={(event) => setPrice(event.target.value)}
                        value={price}
                        required
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium">
                      SKILL.md
                      <Textarea
                        className="min-h-96 font-mono text-xs leading-5"
                        onChange={(event) => setMarkdown(event.target.value)}
                        value={markdown}
                        required
                      />
                    </label>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                      <p className="text-xs text-muted-foreground">
                        {hasMarkdownChanges
                          ? "Bundle changes will be encrypted after the on-chain update."
                          : "No SKILL.md changes yet."}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setEditMode(false)}
                          type="button"
                          variant="outline"
                        >
                          Cancel
                        </Button>
                        <Button
                          disabled={
                            saving || (author.authenticated && !canSave)
                          }
                          type="submit"
                        >
                          <Save />{" "}
                          {saving
                            ? "Updating…"
                            : author.authenticated
                              ? canSave
                                ? "Update skill"
                                : "Configure registry"
                              : "Connect Privy to update"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Change preview</CardTitle>
                  <CardDescription>
                    Red lines are removed. Green lines are added.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-[35rem] overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs leading-5">
                    {lines.map((line, index) => (
                      <div
                        className={
                          line.kind === "added"
                            ? "bg-emerald-500/15 px-1 text-emerald-800 dark:text-emerald-300"
                            : line.kind === "removed"
                              ? "bg-red-500/15 px-1 text-red-800 dark:text-red-300"
                              : "px-1 text-muted-foreground"
                        }
                        key={`${line.kind}-${index}`}
                      >
                        {line.kind === "added"
                          ? "+"
                          : line.kind === "removed"
                            ? "−"
                            : " "}{" "}
                        {line.value || " "}
                      </div>
                    ))}
                  </pre>
                </CardContent>
              </Card>
            </>
          )}
        </main>
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                <CardTitle>Analytics</CardTitle>
              </div>
              <CardDescription>Indexed purchase receipts.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Paid installs</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {skill.paidInstalls.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Creator payouts
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    ${generatedRevenue}
                  </p>
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Installs · last 7 days
                </p>
                <div className="flex h-32 items-end gap-2">
                  {installsByDay.map((installs, index) => (
                    <div
                      className="flex h-full flex-1 flex-col justify-end gap-2"
                      key={index}
                    >
                      <div
                        className="rounded-t bg-primary/80 transition-colors hover:bg-primary"
                        style={{ height: `${(installs / maxInstalls) * 100}%` }}
                        title={`${installs} installs`}
                      />
                      <span className="text-center text-[10px] text-muted-foreground">
                        {["M", "T", "W", "T", "F", "S", "S"][index]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid gap-2 pt-6">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CircleDollarSign className="size-4 text-primary" /> Instant
                settlement
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Each paid install sends 95% USDC directly to your Privy wallet.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </MarketplaceShell>
  );
}
