import { createContext, useContext } from "react"

export type AuthorIdentity = {
  configured: boolean
  ready: boolean
  authenticated: boolean
  displayName: string
  walletAddress?: string
  login: () => void
  logout: () => void
  signMessage?: (message: string) => Promise<string>
  sendTransaction?: (request: { to: string; data: string; chainId: number }) => Promise<{ hash: `0x${string}` }>
}

export const AuthorAuthContext = createContext<AuthorIdentity | null>(null)

export function useAuthorAuth() {
  const value = useContext(AuthorAuthContext)
  if (!value) throw new Error("useAuthorAuth must be used inside AuthorAuthProvider")
  return value
}
