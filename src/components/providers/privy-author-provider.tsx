import type { ReactNode } from "react"
import { PrivyProvider, usePrivy, useSendTransaction, useSignMessage } from "@privy-io/react-auth"
import { AuthorAuthContext, type AuthorIdentity } from "./author-auth-context"
import { UsernameClaimDialog } from "@/components/organisms/username-claim-dialog"

const privyConfig = {
  embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" as const } },
}

function PrivyAuthorIdentityProvider({ children }: { children: ReactNode }) {
  const { authenticated, login, logout, ready, user } = usePrivy()
  const { sendTransaction } = useSendTransaction()
  const { signMessage } = useSignMessage()
  const embeddedWallet = user?.linkedAccounts.find((account) => account.type === "wallet" && account.chainType === "ethereum" && account.walletClientType === "privy" && account.walletIndex === 0)
  const walletAddress = embeddedWallet && "address" in embeddedWallet ? embeddedWallet.address : undefined
  const value: AuthorIdentity = { configured: true, ready, authenticated, displayName: user?.email?.address ?? "Author", walletAddress, login, logout, signMessage: async (message) => (await signMessage({ message })).signature, sendTransaction: async (request) => sendTransaction(request) }
  return <AuthorAuthContext.Provider value={value}><UsernameClaimDialog />{children}</AuthorAuthContext.Provider>
}

export function PrivyAuthorProvider({ appId, children }: { appId: string; children: ReactNode }) {
  return <PrivyProvider appId={appId} config={privyConfig}><PrivyAuthorIdentityProvider>{children}</PrivyAuthorIdentityProvider></PrivyProvider>
}
