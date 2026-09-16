import { base, baseSepolia } from "viem/chains"

const BASE_MAINNET_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const

const chainId = Number(import.meta.env.VITE_BASE_CHAIN_ID ?? "84532")
if (chainId !== base.id && chainId !== baseSepolia.id) {
  throw new Error(`Unsupported VITE_BASE_CHAIN_ID ${import.meta.env.VITE_BASE_CHAIN_ID ?? ""}`)
}

const isMainnet = chainId === base.id
export const baseNetwork = {
  chain: isMainnet ? base : baseSepolia,
  chainId,
  chainHex: `0x${chainId.toString(16)}`,
  name: isMainnet ? "Base" : "Base Sepolia",
  rpcUrl: import.meta.env.VITE_BASE_RPC_URL ?? import.meta.env.VITE_BASE_SEPOLIA_RPC_URL ?? (isMainnet ? "https://mainnet.base.org" : "https://sepolia.base.org"),
  explorerUrl: isMainnet ? "https://basescan.org" : "https://sepolia.basescan.org",
  usdcAddress: (import.meta.env.VITE_USDC_ADDRESS ?? (isMainnet ? BASE_MAINNET_USDC : BASE_SEPOLIA_USDC)) as `0x${string}`,
  x402Network: import.meta.env.VITE_X402_NETWORK ?? `eip155:${chainId}`,
}

if (baseNetwork.x402Network !== `eip155:${chainId}`) {
  throw new Error(`VITE_X402_NETWORK ${baseNetwork.x402Network} does not match Base chain ${chainId}`)
}
