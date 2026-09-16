// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {SkillRegistry} from "../src/SkillRegistry.sol";

/// @notice Mainnet-only deployment path. The Skillsbay Safe permanently owns
/// the registry and receives platform fees from its first block.
contract DeploySkillRegistryMainnet is Script {
    error WrongChain(uint256 chainId);

    uint256 internal constant BASE_MAINNET_CHAIN_ID = 8453;
    address internal constant SKILLSBAY_SAFE = 0xB0E751821a986c75C1c94832BfEB91672D9110bF;

    function run() external returns (SkillRegistry registry) {
        if (block.chainid != BASE_MAINNET_CHAIN_ID) revert WrongChain(block.chainid);

        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address recorder = vm.envAddress("RECORDER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);
        registry = new SkillRegistry(usdc, SKILLSBAY_SAFE, SKILLSBAY_SAFE, recorder);
        vm.stopBroadcast();
    }
}
