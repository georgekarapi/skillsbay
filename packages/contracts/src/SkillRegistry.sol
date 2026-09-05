// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title SkillRegistry
/// @notice Records paid skill entitlements settled by an x402 resource server.
/// @dev The recorder role is deliberately trusted: standard x402 USDC settlement transfers
///      tokens to this registry but cannot invoke a skill-specific contract method.
contract SkillRegistry {
    error Unauthorized();
    error InvalidAddress();
    error InvalidPrice();
    error SkillAlreadyExists();
    error SkillNotFound();
    error SkillInactive();
    error AlreadyPurchased();
    error PaymentAlreadyProcessed();
    error TransferFailed();
    error InvalidFee();

    struct Skill {
        address author;
        uint96 price;
        uint32 majorVersion;
        bool active;
        string metadataURI;
    }

    IERC20 public immutable usdc;
    address public owner;
    address public recorder;
    address public platformTreasury;
    uint16 public platformFeeBps;

    mapping(bytes32 skillId => Skill skill) private skills;
    mapping(bytes32 skillId => mapping(address buyer => bool purchased)) public hasPurchased;
    mapping(bytes32 paymentTxHash => bool processed) public processedPaymentTransactions;

    event SkillRegistered(bytes32 indexed skillId, address indexed author, uint96 price, uint32 majorVersion, string metadataURI);
    event SkillUpdated(bytes32 indexed skillId, uint96 price, bool active, string metadataURI);
    event SkillPurchased(address indexed buyer, bytes32 indexed skillId, uint256 amount, uint256 authorAmount, bytes32 indexed paymentTxHash);
    event RecorderUpdated(address indexed recorder);
    event PlatformFeeUpdated(uint16 feeBps);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyRecorder() {
        if (msg.sender != recorder) revert Unauthorized();
        _;
    }

    constructor(address usdc_, address initialOwner_, address platformTreasury_, address recorder_) {
        if (usdc_ == address(0) || initialOwner_ == address(0) || platformTreasury_ == address(0) || recorder_ == address(0)) revert InvalidAddress();
        usdc = IERC20(usdc_);
        owner = initialOwner_;
        platformTreasury = platformTreasury_;
        recorder = recorder_;
        platformFeeBps = 500;
    }

    function registerSkill(bytes32 skillId, uint96 price, uint32 majorVersion, string calldata metadataURI) external {
        if (price == 0) revert InvalidPrice();
        if (skills[skillId].author != address(0)) revert SkillAlreadyExists();
        skills[skillId] = Skill({ author: msg.sender, price: price, majorVersion: majorVersion, active: true, metadataURI: metadataURI });
        emit SkillRegistered(skillId, msg.sender, price, majorVersion, metadataURI);
    }

    function updateSkill(bytes32 skillId, uint96 price, bool active, string calldata metadataURI) external {
        Skill storage skill = skills[skillId];
        if (skill.author == address(0)) revert SkillNotFound();
        if (msg.sender != skill.author) revert Unauthorized();
        if (price == 0) revert InvalidPrice();
        skill.price = price;
        skill.active = active;
        skill.metadataURI = metadataURI;
        emit SkillUpdated(skillId, price, active, metadataURI);
    }

    function recordPurchase(bytes32 skillId, address buyer, uint256 amount, bytes32 paymentTxHash) external onlyRecorder {
        Skill storage skill = skills[skillId];
        if (skill.author == address(0)) revert SkillNotFound();
        if (!skill.active) revert SkillInactive();
        if (hasPurchased[skillId][buyer]) revert AlreadyPurchased();
        if (processedPaymentTransactions[paymentTxHash]) revert PaymentAlreadyProcessed();
        if (amount != skill.price) revert InvalidPrice();
        hasPurchased[skillId][buyer] = true;
        processedPaymentTransactions[paymentTxHash] = true;
        uint256 fee = (amount * platformFeeBps) / 10_000;
        uint256 authorAmount = amount - fee;
        if (!usdc.transfer(skill.author, authorAmount)) revert TransferFailed();
        if (!usdc.transfer(platformTreasury, fee)) revert TransferFailed();
        emit SkillPurchased(buyer, skillId, amount, authorAmount, paymentTxHash);
    }

    function setRecorder(address recorder_) external onlyOwner {
        if (recorder_ == address(0)) revert InvalidAddress();
        recorder = recorder_;
        emit RecorderUpdated(recorder_);
    }

    function setPlatformFeeBps(uint16 feeBps) external onlyOwner {
        if (feeBps > 1_000) revert InvalidFee();
        platformFeeBps = feeBps;
        emit PlatformFeeUpdated(feeBps);
    }

    function getSkill(bytes32 skillId) external view returns (Skill memory) {
        return skills[skillId];
    }
}
