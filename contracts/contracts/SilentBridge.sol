// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ISilentBridge.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IFHERelayer.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title SilentBridge
 * @notice Privacy-preserving cross-chain bridge with FHE encryption support
 * @dev Supports encrypted routing preferences and private cross-chain transfers
 */
contract SilentBridge is ISilentBridge, Ownable, ReentrancyGuard, Pausable {
    // Struct to store deposit information
    struct DepositInfo {
        address user;
        address token;
        uint256 amount;
        uint256 sourceChainId;
        uint256 targetChainId;
        bytes encryptedRoutingIntent;
        bool withdrawn;
        uint256 timestamp;
    }

    // Mapping from deposit ID to deposit info
    mapping(bytes32 => DepositInfo) public deposits;

    // Mapping from source chain ID => deposit ID => exists
    mapping(uint256 => mapping(bytes32 => bool)) public depositsByChain;

    // Mapping to track if deposit ID has been used (prevent replay attacks)
    mapping(bytes32 => bool) public usedDepositIds;

    // FHE Relayer contract address (optional, can be address(0) if not integrated)
    address public fheRelayer;

    // Executor addresses authorized to execute withdrawals
    mapping(address => bool) public executors;

    // Minimum deposit amount to prevent dust attacks
    uint256 public minDepositAmount;

    // Chain ID of this contract
    uint256 public immutable chainId;

    // Events
    event ExecutorAdded(address indexed executor);
    event ExecutorRemoved(address indexed executor);
    event FHERelayerUpdated(address indexed oldRelayer, address indexed newRelayer);
    event MinDepositAmountUpdated(uint256 oldAmount, uint256 newAmount);

    modifier onlyExecutor() {
        require(executors[msg.sender], "SilentBridge: not an executor");
        _;
    }

    modifier validDeposit(
        address token,
        uint256 amount,
        uint256 targetChainId
    ) {
        require(amount >= minDepositAmount, "SilentBridge: amount too small");
        require(targetChainId != chainId, "SilentBridge: invalid target chain");
        require(targetChainId != 0, "SilentBridge: target chain cannot be zero");
        _;
    }

    /**
     * @notice Constructor
     * @param _owner Owner address (can add/remove executors)
     * @param _minDepositAmount Minimum deposit amount
     */
    constructor(address _owner, uint256 _minDepositAmount) Ownable(_owner) {
        require(_owner != address(0), "SilentBridge: invalid owner");
        require(_minDepositAmount > 0, "SilentBridge: invalid min deposit");
        
        chainId = block.chainid;
        minDepositAmount = _minDepositAmount;
    }

    /**
     * @notice Deposit tokens for cross-chain bridging
     * @param token Address of token to deposit (address(0) for native ETH)
     * @param amount Amount to deposit
     * @param targetChainId Target chain ID for withdrawal
     * @param encryptedRoutingIntent Encrypted FHE routing preference
     * @return depositId Unique identifier for this deposit
     */
    function deposit(
        address token,
        uint256 amount,
        uint256 targetChainId,
        bytes calldata encryptedRoutingIntent
    )
        external
        payable
        override
        nonReentrant
        whenNotPaused
        validDeposit(token, amount, targetChainId)
        returns (bytes32 depositId)
    {
        // Generate deposit ID from user, token, amount, and nonce
        depositId = keccak256(
            abi.encodePacked(
                msg.sender,
                token,
                amount,
                targetChainId,
                block.timestamp,
                block.number,
                gasleft()
            )
        );

        // Ensure deposit ID is unique
        require(!deposits[depositId].withdrawn && deposits[depositId].user == address(0), 
            "SilentBridge: deposit ID collision");

        // Handle native ETH deposit
        if (token == address(0)) {
            require(msg.value == amount, "SilentBridge: incorrect ETH amount");
        } else {
            // Handle ERC20 token deposit
            require(msg.value == 0, "SilentBridge: ETH sent with token deposit");
            IERC20(token).transferFrom(msg.sender, address(this), amount);
        }

        // Store deposit information
        deposits[depositId] = DepositInfo({
            user: msg.sender,
            token: token,
            amount: amount,
            sourceChainId: chainId,
            targetChainId: targetChainId,
            encryptedRoutingIntent: encryptedRoutingIntent,
            withdrawn: false,
            timestamp: block.timestamp
        });

        depositsByChain[chainId][depositId] = true;

        // Emit deposit event
        emit Deposit(
            depositId,
            msg.sender,
            token,
            amount,
            chainId,
            targetChainId,
            encryptedRoutingIntent
        );
    }

    /**
     * @notice Execute withdrawal on target chain
     * @param depositId Original deposit identifier
     * @param user Address to receive the withdrawal
     * @param token Address of token to withdraw
     * @param amount Amount to withdraw
     * @param sourceChainId Source chain ID where deposit was made
     * @param proof Proof of deposit from source chain (for future verification)
     */
    function withdraw(
        bytes32 depositId,
        address user,
        address token,
        uint256 amount,
        uint256 sourceChainId,
        bytes calldata proof
    ) external override nonReentrant whenNotPaused onlyExecutor {
        require(user != address(0), "SilentBridge: invalid user");
        require(amount > 0, "SilentBridge: invalid amount");
        require(sourceChainId != chainId, "SilentBridge: invalid source chain");
        require(!usedDepositIds[depositId], "SilentBridge: deposit already used");

        // Mark deposit as used to prevent replay attacks
        usedDepositIds[depositId] = true;

        // Handle native ETH withdrawal
        if (token == address(0)) {
            require(address(this).balance >= amount, "SilentBridge: insufficient ETH balance");
            (bool success, ) = payable(user).call{value: amount}("");
            require(success, "SilentBridge: ETH transfer failed");
        } else {
            // Handle ERC20 token withdrawal
            require(
                IERC20(token).balanceOf(address(this)) >= amount,
                "SilentBridge: insufficient token balance"
            );
            require(
                IERC20(token).transfer(user, amount),
                "SilentBridge: token transfer failed"
            );
        }

        // Emit withdrawal event
        emit Withdrawal(depositId, user, token, amount, chainId);

        // Note: In a production system, you would verify the proof here
        // This could involve checking signatures, merkle proofs, or oracle data
        // For now, we rely on executor trust (can be upgraded to trustless verification)
    }

    /**
     * @notice Update encrypted routing intent for a deposit
     * @param depositId Deposit identifier
     * @param encryptedRoutingIntent New encrypted routing intent
     */
    function updateRoutingIntent(
        bytes32 depositId,
        bytes calldata encryptedRoutingIntent
    ) external override nonReentrant whenNotPaused {
        DepositInfo storage depositInfo = deposits[depositId];
        require(depositInfo.user == msg.sender, "SilentBridge: not deposit owner");
        require(!depositInfo.withdrawn, "SilentBridge: deposit already withdrawn");
        require(encryptedRoutingIntent.length > 0, "SilentBridge: invalid routing intent");

        depositInfo.encryptedRoutingIntent = encryptedRoutingIntent;

        emit RoutingIntentUpdated(depositId, encryptedRoutingIntent);
    }

    /**
     * @notice Check if a deposit exists
     * @param depositId Deposit identifier
     * @return exists Whether the deposit exists
     */
    function depositExists(bytes32 depositId) external view override returns (bool) {
        return deposits[depositId].user != address(0);
    }

    /**
     * @notice Get deposit information
     * @param depositId Deposit identifier
     * @return user User who made the deposit
     * @return token Token address
     * @return amount Deposit amount
     * @return sourceChainId Source chain ID
     * @return targetChainId Target chain ID
     * @return encryptedRoutingIntent Encrypted routing intent
     * @return withdrawn Whether the deposit has been withdrawn
     */
    function getDeposit(
        bytes32 depositId
    )
        external
        view
        override
        returns (
            address user,
            address token,
            uint256 amount,
            uint256 sourceChainId,
            uint256 targetChainId,
            bytes memory encryptedRoutingIntent,
            bool withdrawn
        )
    {
        DepositInfo memory depositInfo = deposits[depositId];
        return (
            depositInfo.user,
            depositInfo.token,
            depositInfo.amount,
            depositInfo.sourceChainId,
            depositInfo.targetChainId,
            depositInfo.encryptedRoutingIntent,
            depositInfo.withdrawn
        );
    }

    /**
     * @notice Add an executor address
     * @param executor Address to add as executor
     */
    function addExecutor(address executor) external onlyOwner {
        require(executor != address(0), "SilentBridge: invalid executor");
        require(!executors[executor], "SilentBridge: executor already exists");
        executors[executor] = true;
        emit ExecutorAdded(executor);
    }

    /**
     * @notice Remove an executor address
     * @param executor Address to remove as executor
     */
    function removeExecutor(address executor) external onlyOwner {
        require(executors[executor], "SilentBridge: executor does not exist");
        executors[executor] = false;
        emit ExecutorRemoved(executor);
    }

    /**
     * @notice Update FHE Relayer address
     * @param _fheRelayer New FHE Relayer address
     */
    function setFHERelayer(address _fheRelayer) external onlyOwner {
        address oldRelayer = fheRelayer;
        fheRelayer = _fheRelayer;
        emit FHERelayerUpdated(oldRelayer, _fheRelayer);
    }

    /**
     * @notice Update minimum deposit amount
     * @param _minDepositAmount New minimum deposit amount
     */
    function setMinDepositAmount(uint256 _minDepositAmount) external onlyOwner {
        require(_minDepositAmount > 0, "SilentBridge: invalid min deposit");
        uint256 oldAmount = minDepositAmount;
        minDepositAmount = _minDepositAmount;
        emit MinDepositAmountUpdated(oldAmount, _minDepositAmount);
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw tokens (owner only)
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            (bool success, ) = payable(owner()).call{value: amount}("");
            require(success, "SilentBridge: ETH transfer failed");
        } else {
            require(
                IERC20(token).transfer(owner(), amount),
                "SilentBridge: token transfer failed"
            );
        }
    }

    /**
     * @notice Receive ETH
     */
    receive() external payable {
        // Allow contract to receive ETH
    }
}

