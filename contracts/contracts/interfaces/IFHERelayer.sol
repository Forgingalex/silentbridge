// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IFHERelayer
 * @notice Interface for FHE Relayer integration (Zama FHE)
 * @dev This interface allows the bridge to interact with FHE-encrypted data
 */
interface IFHERelayer {
    /**
     * @notice Verify FHE-encrypted routing intent
     * @param encryptedData Encrypted routing preference data
     * @return isValid Whether the encrypted data is valid
     */
    function verifyEncryptedRoutingIntent(
        bytes calldata encryptedData
    ) external view returns (bool isValid);

    /**
     * @notice Process encrypted routing intent for bridge execution
     * @param encryptedData Encrypted routing preference
     * @return processedData Processed routing data (still encrypted)
     */
    function processRoutingIntent(
        bytes calldata encryptedData
    ) external view returns (bytes memory processedData);
}

