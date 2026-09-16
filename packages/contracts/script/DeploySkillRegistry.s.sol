// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {SkillRegistry} from "../src/SkillRegistry.sol";

/// @notice Deploys Skillsbay's registry with production addresses supplied at
/// runtime. Nothing network-specific is baked into bytecode or source.
contract DeploySkillRegistry is Script {
    uint256 internal constant BASE_MAINNET_CHAIN_ID = 8453;
    address internal constant SKILLSBAY_SAFE = 0xB0E751821a986c75C1c94832BfEB91672D9110bF;

    function run() external returns (SkillRegistry registry) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address usdc = vm.envAddress("USDC_ADDRESS");
        address defaultAdmin = block.chainid == BASE_MAINNET_CHAIN_ID ? SKILLSBAY_SAFE : deployer;
        address initialOwner = vm.envOr("INITIAL_OWNER_ADDRESS", defaultAdmin);
        address platformTreasury = vm.envOr("PLATFORM_TREASURY_ADDRESS", defaultAdmin);
        address recorder = vm.envAddress("RECORDER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);
        registry = new SkillRegistry(usdc, initialOwner, platformTreasury, recorder);
        vm.stopBroadcast();
    }
}
