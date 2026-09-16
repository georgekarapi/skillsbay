#!/usr/bin/env bash
set -euo pipefail

mainnet=false

case "${1:-}" in
  "") ;;
  --mainnet) mainnet=true ;;
  --help|-h)
    echo "Usage: ./script/deploy-registry.sh [--mainnet]"
    echo "  Default: Base Sepolia; deployer is owner and treasury."
    echo "  --mainnet: Base mainnet; Skillsbay Safe is owner and treasury."
    exit 0
    ;;
  *)
    echo "Unknown argument: $1" >&2
    exit 1
    ;;
esac

if $mainnet; then
  environment_name=".env.mainnet"
  rpc_variable="BASE_MAINNET_RPC_URL"
  chain_id="8453"
  deploy_script="script/DeploySkillRegistryMainnet.s.sol:DeploySkillRegistryMainnet"
  broadcast_name="DeploySkillRegistryMainnet.s.sol"
else
  environment_name=".env.sepolia"
  rpc_variable="BASE_SEPOLIA_RPC_URL"
  chain_id="84532"
  deploy_script="script/DeploySkillRegistry.s.sol:DeploySkillRegistry"
  broadcast_name="DeploySkillRegistry.s.sol"
fi

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
environment_file="$project_root/$environment_name"

if [[ ! -f "$environment_file" ]]; then
  echo "Missing $environment_name at the workspace root. Copy its matching .example file and fill the required values." >&2
  exit 1
fi

set -a
source "$environment_file"
set +a

if [[ -n "${SKILL_REGISTRY_ADDRESS:-}" && "$SKILL_REGISTRY_ADDRESS" != "0x0000000000000000000000000000000000000000" ]]; then
  echo "Registry already configured at $SKILL_REGISTRY_ADDRESS; deployment skipped."
  exit 0
fi

broadcast_file="broadcast/$broadcast_name/$chain_id/run-latest.json"
if [[ -f "$broadcast_file" ]]; then
  deployed_address="$(jq -r '.transactions[] | select(.contractName == "SkillRegistry" and .transactionType == "CREATE") | .contractAddress' "$broadcast_file" | head -n 1)"
  if [[ -n "$deployed_address" && "$deployed_address" != "null" ]]; then
    echo "Existing deployment output found: $deployed_address"
    echo "Deployment skipped. Set SKILL_REGISTRY_ADDRESS to this address after verifying it on BaseScan."
    exit 0
  fi

  echo "Existing broadcast output found at $broadcast_file; deployment stopped for manual review." >&2
  exit 1
fi

rpc_url="${!rpc_variable:?Missing $rpc_variable in $environment_file}"
echo "Deploying to Base chain $chain_id using $deploy_script"
forge script "$deploy_script" --rpc-url "$rpc_url" --broadcast
