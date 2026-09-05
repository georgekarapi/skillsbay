import { lazy, Suspense, type ReactNode } from "react"
import { AuthorAuthContext, type AuthorIdentity } from "./author-auth-context"

const PrivyAuthorProvider = lazy(() => import("./privy-author-provider").then((module) => ({ default: module.PrivyAuthorProvider })))
const demoIdentity: AuthorIdentity = { configured: false, ready: true, authenticated: false, displayName: "Author", login: () => undefined, logout: () => undefined }

export function AuthorAuthProvider({ children }: { children: ReactNode }) {
  const appId = import.meta.env.VITE_PRIVY_APP_ID
  if (!appId) return <AuthorAuthContext.Provider value={demoIdentity}>{children}</AuthorAuthContext.Provider>
  return <Suspense fallback={null}><PrivyAuthorProvider appId={appId}>{children}</PrivyAuthorProvider></Suspense>
}
