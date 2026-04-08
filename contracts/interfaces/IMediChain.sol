// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IMediChain Interface
/// @notice Interface for the MediChain supply chain verification system
interface IMediChain {
    // ============================================================
    // ENUMS & STRUCTS
    // ============================================================

    enum BatchStatus {
        Manufactured, // 0 — freshly registered by manufacturer
        InTransit,    // 1 — transferred to distributor
        AtPharmacy,   // 2 — received by pharmacy
        Sold,         // 3 — completely sold to a patient/patients
        Recalled      // 4 — recalled by manufacturer
    }

    struct MedicineBatch {
        string batchId;
        string medicineName;
        string manufacturer;
        address manufacturerAddr;
        uint256 manufactureDate;
        uint256 expiryDate;
        uint256 quantity;
        uint256 dispensedCount; // How many units have been legally dispensed
        string ipfsHash;
        BatchStatus status;
        bool exists;
    }

    // ============================================================
    // EVENTS
    // ============================================================

    event BatchRegistered(string indexed batchId, address indexed manufacturer, uint256 timestamp);
    event BatchTransferred(string indexed batchId, address indexed from, address indexed to, string role, string location, string notes, BatchStatus newStatus);
    event BatchRecalled(string indexed batchId, string reason, uint256 timestamp);
    event BatchDispensed(string indexed batchId, address indexed pharmacy, uint256 units, uint256 timestamp);

    // ============================================================
    // MANUFACTURER FUNCTIONS
    // ============================================================

    function registerBatch(
        string memory batchId,
        string memory medicineName,
        string memory manufacturer,
        uint256 expiryDate,
        uint256 quantity,
        string memory ipfsHash
    ) external;

    function transferToDistributor(
        string memory batchId,
        address distributor,
        string memory location,
        string memory notes
    ) external;

    function recallBatch(string memory batchId, string memory reason) external;

    // ============================================================
    // DISTRIBUTOR FUNCTIONS
    // ============================================================

    function transferToPharmacy(
        string memory batchId,
        address pharmacy,
        string memory location,
        string memory notes
    ) external;

    // ============================================================
    // PHARMACY FUNCTIONS
    // ============================================================

    function dispenseUnits(string memory batchId, uint256 units) external;

    // ============================================================
    // PUBLIC VIEW FUNCTIONS
    // ============================================================

    function verifyBatch(string memory batchId)
        external
        view
        returns (MedicineBatch memory batch);

    function isBatchGenuine(string memory batchId)
        external
        view
        returns (bool genuine, string memory status, uint256 lastUpdated);

    function batchExists(string memory batchId) external view returns (bool);
}
