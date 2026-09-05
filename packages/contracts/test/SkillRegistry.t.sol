// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {SkillRegistry} from "../src/SkillRegistry.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";

contract SkillRegistryTest is Test {
    event SkillPurchased(address indexed buyer, bytes32 indexed skillId, uint256 amount, uint256 authorAmount, bytes32 indexed paymentTxHash);

    SkillRegistry registry;
    MockUSDC usdc;
    address author = makeAddr("author");
    address buyer = makeAddr("buyer");
    address recorder = makeAddr("recorder");
    address registryOwner = makeAddr("registryOwner");
    address treasury = makeAddr("treasury");
    bytes32 skillId = keccak256("thegraph/substreams-deployer");
    uint96 constant PRICE = 250_000;

    function setUp() public {
        usdc = new MockUSDC();
        registry = new SkillRegistry(address(usdc), registryOwner, treasury, recorder);
        vm.prank(author);
        registry.registerSkill(skillId, PRICE, 1, "https://api.skillsbay.dev/v1/skills/thegraph/substreams-deployer");
    }

    function testAssignsTheConfiguredInitialOwner() public view {
        assertEq(registry.owner(), registryOwner);
    }

    function testRecordsOneEntitlementAndPaysAuthorImmediately() public {
        usdc.mint(address(registry), PRICE);
        vm.expectEmit(true, true, true, true, address(registry));
        emit SkillPurchased(buyer, skillId, PRICE, 237_500, keccak256("payment-1"));
        vm.prank(recorder);
        registry.recordPurchase(skillId, buyer, PRICE, keccak256("payment-1"));

        assertTrue(registry.hasPurchased(skillId, buyer));
        assertEq(usdc.balanceOf(author), 237_500);
        assertEq(usdc.balanceOf(treasury), 12_500);
    }

    function testDoesNotLeaveAuthorEarningsInTheRegistry() public {
        usdc.mint(address(registry), PRICE);
        vm.prank(recorder);
        registry.recordPurchase(skillId, buyer, PRICE, keccak256("payment-1"));

        assertEq(usdc.balanceOf(author), 237_500);
        assertEq(usdc.balanceOf(treasury), 12_500);
        assertEq(usdc.balanceOf(address(registry)), 0);
    }

    function testRejectsDuplicateReceipt() public {
        bytes32 payment = keccak256("payment-1");
        usdc.mint(address(registry), PRICE * 2);
        vm.prank(recorder);
        registry.recordPurchase(skillId, buyer, PRICE, payment);

        vm.prank(recorder);
        vm.expectRevert(SkillRegistry.AlreadyPurchased.selector);
        registry.recordPurchase(skillId, buyer, PRICE, payment);
    }
}
