export type PublishAuthorization = {
  skillId: string
  author: string
  contentSha256: string
  issuedAt: string
}

/**
 * A deliberately small, human-readable EIP-191 payload. It binds a Privy
 * embedded-wallet signature to exactly one encrypted SKILL.md upload.
 */
export function createPublishAuthorizationMessage(input: PublishAuthorization) {
  return [
    "SkillsBay publish authorization",
    `Skill: ${input.skillId}`,
    `Author: ${input.author.toLowerCase()}`,
    `Content SHA-256: ${input.contentSha256}`,
    `Issued at: ${input.issuedAt}`,
  ].join("\n")
}

export type BundleReadAuthorization = {
  skillId: string
  author: string
  issuedAt: string
}

/** Lets a publisher retrieve only their own decrypted source bundle for editing. */
export function createBundleReadAuthorizationMessage(input: BundleReadAuthorization) {
  return [
    "SkillsBay bundle read authorization",
    `Skill: ${input.skillId}`,
    `Author: ${input.author.toLowerCase()}`,
    `Issued at: ${input.issuedAt}`,
  ].join("\n")
}

export type InstallRequestAuthorization = {
  installRequestId: string
  skillId: string
  buyer: string
  issuedAt: string
}

/** Proves that the wallet entitled to a bundle explicitly unlocks this one CLI install. */
export function createInstallRequestAuthorizationMessage(input: InstallRequestAuthorization) {
  return [
    "SkillsBay install authorization",
    `Install request: ${input.installRequestId}`,
    `Skill: ${input.skillId}`,
    `Wallet: ${input.buyer.toLowerCase()}`,
    `Issued at: ${input.issuedAt}`,
  ].join("\n")
}

export type UsernameAuthorization = {
  walletAddress: string
  username: string
  issuedAt: string
}

/** Binds the one-time SkillsBay publisher handle to its embedded-wallet owner. */
export function createUsernameAuthorizationMessage(input: UsernameAuthorization) {
  return [
    "SkillsBay username authorization",
    `Wallet: ${input.walletAddress.toLowerCase()}`,
    `Username: ${input.username.toLowerCase()}`,
    `Issued at: ${input.issuedAt}`,
  ].join("\n")
}
