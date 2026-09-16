import type { Chain } from "viem"
import { base, baseSepolia } from "viem/chains"

const BASE_MAINNET_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const
const BASE_MAINNET_CIRCLE_PAYMASTER_V08 = "0x6C973eBe80dCD8660841D4356bf15c32460271C9" as const
const BASE_SEPOLIA_CIRCLE_PAYMASTER_V08 = "0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966" as const

type BaseNetworkBindings = {
  BASE_CHAIN_ID?: string
  BASE_RPC_URL?: string
  // Legacy local-development name. Production must use BASE_RPC_URL.
  BASE_SEPOLIA_RPC_URL?: string
  USDC_ADDRESS?: string
  CIRCLE_PAYMASTER_ADDRESS?: string
  X402_NETWORK?: string
  X402_FACILITATOR_URL?: string
  BUNDLER_RPC_URL?: string
}

export type BaseNetworkConfig = {
  chain: Chain
  rpcUrl: string
  usdcAddress: `0x${string}`
  circlePaymasterAddress: `0x${string}`
  x402Network: string
  x402FacilitatorUrl: string
  bundlerRpcUrl?: string
}

export function baseNetworkConfig(env: BaseNetworkBindings): BaseNetworkConfig {
  const chainId = Number(env.BASE_CHAIN_ID ?? "84532")
  if (chainId !== base.id && chainId !== baseSepolia.id) {
    throw new Error(`Unsupported BASE_CHAIN_ID ${env.BASE_CHAIN_ID ?? ""}; expected ${base.id} or ${baseSepolia.id}`)
  }

  const isMainnet = chainId === base.id
  const chain = isMainnet ? base : baseSepolia
  const rpcUrl = env.BASE_RPC_URL ?? env.BASE_SEPOLIA_RPC_URL ?? (isMainnet ? "https://mainnet.base.org" : "https://sepolia.base.org")
  const x402Network = env.X402_NETWORK ?? `eip155:${chain.id}`
  if (x402Network !== `eip155:${chain.id}`) {
    throw new Error(`X402_NETWORK ${x402Network} does not match Base chain ${chain.id}`)
  }

  if (isMainnet && !env.X402_FACILITATOR_URL) {
    throw new Error("X402_FACILITATOR_URL is required for Base mainnet")
  }
  if (isMainnet && !env.BUNDLER_RPC_URL) {
    throw new Error("BUNDLER_RPC_URL is required for Base mainnet")
  }

  return {
    chain,
    rpcUrl,
    usdcAddress: (env.USDC_ADDRESS ?? (isMainnet ? BASE_MAINNET_USDC : BASE_SEPOLIA_USDC)) as `0x${string}`,
    circlePaymasterAddress: (env.CIRCLE_PAYMASTER_ADDRESS ?? (isMainnet ? BASE_MAINNET_CIRCLE_PAYMASTER_V08 : BASE_SEPOLIA_CIRCLE_PAYMASTER_V08)) as `0x${string}`,
    x402Network,
    x402FacilitatorUrl: env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator",
    bundlerRpcUrl: env.BUNDLER_RPC_URL ?? (isMainnet ? undefined : `https://public.pimlico.io/v2/${chain.id}/rpc`),
  }
}
