import { useState, type FormEvent } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, LoaderCircle } from "lucide-react"
import { toast } from "sonner"
import { useAuthorAuth } from "@/components/providers/author-auth-context"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { checkUsernameAvailability, claimAuthorUsername, getAuthorProfile } from "@/lib/marketplace-api"
import { createUsernameAuthorizationMessage } from "@skillsbay/shared/publish-authorization"

const usernamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function UsernameClaimDialog() {
  const author = useAuthorAuth()
  const queryClient = useQueryClient()
  const [username, setUsername] = useState("")
  const [claiming, setClaiming] = useState(false)
  const profile = useQuery({ queryKey: ["author-profile", author.walletAddress], queryFn: () => getAuthorProfile(author.walletAddress!), enabled: Boolean(author.authenticated && author.walletAddress) })
  const normalized = username.trim().toLowerCase()
  const isValid = normalized.length >= 3 && normalized.length <= 32 && usernamePattern.test(normalized)
  const availability = useQuery({ queryKey: ["username-availability", normalized], queryFn: () => checkUsernameAvailability(normalized), enabled: Boolean(profile.data === null && isValid), staleTime: 5_000 })
  const open = Boolean(author.authenticated && author.walletAddress && profile.data === null)

  async function claim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!author.walletAddress || !author.signMessage || !isValid || !availability.data?.available) return
    setClaiming(true)
    try {
      const issuedAt = new Date().toISOString()
      const message = createUsernameAuthorizationMessage({ walletAddress: author.walletAddress, username: normalized, issuedAt })
      const signature = await author.signMessage(message)
      await claimAuthorUsername({ walletAddress: author.walletAddress, username: normalized, issuedAt, signature })
      await queryClient.invalidateQueries({ queryKey: ["author-profile", author.walletAddress] })
      toast.success(`@${normalized} is your Skillsbay namespace`)
    } catch (error) {
      toast.error("Could not claim username", { description: error instanceof Error ? error.message : "Choose another username and try again." })
      await queryClient.invalidateQueries({ queryKey: ["username-availability", normalized] })
    } finally {
      setClaiming(false)
    }
  }

  return <Dialog open={open}><DialogContent showCloseButton={false} onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}><DialogHeader><DialogTitle>Choose your Skillsbay username</DialogTitle><DialogDescription>Your username is your permanent publisher namespace. It will be used for every skill you publish.</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={claim}><label className="grid gap-2 text-sm font-medium">Username<Input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} placeholder="graph-labs" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" autoCapitalize="none" autoComplete="username" required /></label><div className="min-h-5 text-xs">{!username ? <span className="text-muted-foreground">3–32 lowercase letters, numbers, or hyphens.</span> : !isValid ? <span className="text-destructive">No spaces or special characters.</span> : availability.isFetching ? <span className="inline-flex items-center gap-1 text-muted-foreground"><LoaderCircle className="size-3 animate-spin" /> Checking availability…</span> : availability.data?.available ? <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="size-3" /> @{normalized} is available</span> : <span className="text-destructive">@{normalized} is already taken</span>}</div><DialogFooter><Button className="w-full" disabled={!isValid || !availability.data?.available || claiming} type="submit">{claiming ? "Confirm in Privy…" : "Claim username"}</Button></DialogFooter></form></DialogContent></Dialog>
}
