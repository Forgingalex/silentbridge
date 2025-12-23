// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ISilentBridge
 * @notice Interface for SilentBridge - Privacy-preserving cross-chain bridge
 */
interface ISilentBridge {
    /**
     * @notice Emitted when a deposit is made
     * @param depositId Unique identifier for the deposit
     * @param user Address of the user making the deposit
     * @param token Address of the token being deposited (address(0) for native ETH)
     * @param amount Amount being deposited
     * @param sourceChainId Chain ID where deposit is made
     * @param targetChainId Chain ID where withdrawal will occur
     * @param encryptedRoutingIntent Encrypted FHE routing preference
     */
    event Deposit(
        bytes32 indexed depositId,
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 sourceChainId,
        uint256 targetChainId,
        bytes encryptedRoutingIntent
    );

    /**
     * @notice Emitted when a withdrawal is executed
     * @param depositId Original deposit identifier
     * @param user Address receiving the withdrawal
     * @param token Address of the token being withdrawn
     * @param amount Amount being withdrawn
     * @param targetChainId Chain ID where withdrawal occurred
     */
    event Withdrawal(
        bytes32 indexed depositId,
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 targetChainId
    );

    /**
     * @notice Emitted when encrypted routing intent is updated
     * @param depositId Deposit identifier
     * @param encryptedRoutingIntent New encrypted routing intent
     */
    event RoutingIntentUpdated(
        bytes32 indexed depositId,
        bytes encryptedRoutingIntent
    );

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
    ) external payable returns (bytes32 depositId);

    /**
     * @notice Execute withdrawal on target chain
     * @param depositId Original deposit identifier
     * @param user Address to receive the withdrawal
     * @param token Address of token to withdraw
     * @param amount Amount to withdraw
     * @param sourceChainId Source chain ID where deposit was made
     * @param proof Proof of deposit from source chain
     */
    function withdraw(
        bytes32 depositId,
        address user,
        address token,
        uint256 amount,
        uint256 sourceChainId,
        bytes calldata proof
    ) external;

    /**
     * @notice Update encrypted routing intent for a deposit
     * @param depositId Deposit identifier
     * @param encryptedRoutingIntent New encrypted routing intent
     */
    function updateRoutingIntent(
        bytes32 depositId,
        bytes calldata encryptedRoutingIntent
    ) external;

    /**
     * @notice Check if a deposit exists
     * @param depositId Deposit identifier
     * @return exists Whether the deposit exists
     */
    function depositExists(bytes32 depositId) external view returns (bool);

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
        returns (
            address user,
            address token,
            uint256 amount,
            uint256 sourceChainId,
            uint256 targetChainId,
            bytes memory encryptedRoutingIntent,
            bool withdrawn
        );
}

