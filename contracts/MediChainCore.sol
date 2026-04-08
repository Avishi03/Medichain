// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./RoleManager.sol";
import "./interfaces/IMediChain.sol";

/// @title MediChainCore
/// @notice Main contract for medicine batch registration, supply chain tracking,
///         and authenticity verification. Integrates with RoleManager for access control.
/// @dev Inherits Ownable (admin emergency controls), Pausable, ReentrancyGuard
contract MediChainCore is IMediChain, Ownable, Pausable, ReentrancyGuard {
    // ============================================================
    // STATE
    // ============================================================

    RoleManager public immutable roleManager;

    /// @dev batchId => MedicineBatch
    mapping(string => MedicineBatch) private batches;

    /// @dev batchId => current owner address
    mapping(string => address) private batchOwner;

    /// @dev batchId => recall reason (set when recalled)
    mapping(string => string) private recallReasons;

    /// @dev Array of all registered batch IDs (for enumeration)
    string[] private allBatchIds;

    /// @dev Total counters for stats
    uint256 public totalBatches;
    uint256 public totalTransfers;
    uint256 public totalRecalls;

    // ============================================================
    // MODIFIERS
    // ============================================================

    modifier onlyManufacturer() {
        require(
            roleManager.hasRole(roleManager.MANUFACTURER_ROLE(), msg.sender),
            "MediChain: caller is not a manufacturer"
        );
        _;
    }

    modifier onlyDistributor() {
        require(
            roleManager.hasRole(roleManager.DISTRIBUTOR_ROLE(), msg.sender),
            "MediChain: caller is not a distributor"
        );
        _;
    }

    modifier onlyPharmacy() {
        require(
            roleManager.hasRole(roleManager.PHARMACY_ROLE(), msg.sender),
            "MediChain: caller is not a pharmacy"
        );
        _;
    }

    modifier batchMustExist(string memory batchId) {
        require(batches[batchId].exists, "MediChain: batch does not exist");
        _;
    }

    modifier notRecalled(string memory batchId) {
        require(
            batches[batchId].status != BatchStatus.Recalled,
            "MediChain: batch has been recalled"
        );
        _;
    }

    // ============================================================
    // CONSTRUCTOR
    // ============================================================

    /// @param _roleManager Address of the deployed RoleManager contract
    constructor(address _roleManager) Ownable(msg.sender) {
        require(_roleManager != address(0), "MediChain: zero address");
        roleManager = RoleManager(_roleManager);
    }

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
    ) external override onlyManufacturer whenNotPaused nonReentrant {
        // require(bytes(batchId).length > 0,        "MediChain: batchId cannot be empty");
        // require(bytes(medicineName).length > 0,   "MediChain: medicineName cannot be empty");
        // require(bytes(manufacturer).length > 0,   "MediChain: manufacturer cannot be empty");
        // require(!batches[batchId].exists,          "MediChain: batchId already registered");
        // require(quantity > 0,                      "MediChain: quantity must be > 0");
        // require(expiryDate > block.timestamp,      "MediChain: expiry must be in the future");

        uint256 manufactureDate = block.timestamp;
        // require(expiryDate > manufactureDate,      "MediChain: expiry must be after manufacture");

        batches[batchId] = MedicineBatch({
            batchId:         batchId,
            medicineName:    medicineName,
            manufacturer:    manufacturer,
            manufacturerAddr: msg.sender,
            manufactureDate: manufactureDate,
            expiryDate:      expiryDate,
            quantity:        quantity,
            dispensedCount:  0, // initially 0
            ipfsHash:        ipfsHash,
            status:          BatchStatus.Manufactured,
            exists:          true
        });

        batchOwner[batchId] = msg.sender;
        allBatchIds.push(batchId);
        totalBatches++;

        emit BatchRegistered(batchId, msg.sender, block.timestamp);
        emit BatchTransferred(batchId, address(0), msg.sender, "MANUFACTURER", "Manufacturing Facility", string(abi.encodePacked("Batch registered by ", manufacturer)), BatchStatus.Manufactured);
    }

    function transferToDistributor(
        string memory batchId,
        address distributor,
        string memory location,
        string memory notes
    )
        external
        override
        onlyManufacturer
        whenNotPaused
        nonReentrant
        batchMustExist(batchId)
        notRecalled(batchId)
    {
        // require(
        //     batches[batchId].status == BatchStatus.Manufactured,
        //     "MediChain: batch not in Manufactured state"
        // );
        // require(
        //     batchOwner[batchId] == msg.sender,
        //     "MediChain: caller is not the batch owner"
        // );
        // require(
        //     roleManager.hasRole(roleManager.DISTRIBUTOR_ROLE(), distributor),
        //     "MediChain: recipient is not a registered distributor"
        // );
        // require(distributor != address(0), "MediChain: zero address");

        // Update state
        batches[batchId].status = BatchStatus.InTransit;
        batchOwner[batchId] = distributor;
        totalTransfers++;

        emit BatchTransferred(batchId, msg.sender, distributor, "MANUFACTURER", location, notes, BatchStatus.InTransit);
    }

    function recallBatch(string memory batchId, string memory reason)
        external
        override
        onlyManufacturer
        whenNotPaused
        nonReentrant
        batchMustExist(batchId)
    {
        require(
            batches[batchId].manufacturerAddr == msg.sender,
            "MediChain: only original manufacturer can recall"
        );
        require(
            batches[batchId].status != BatchStatus.Recalled,
            "MediChain: batch already recalled"
        );
        require(bytes(reason).length > 0, "MediChain: recall reason cannot be empty");

        batches[batchId].status = BatchStatus.Recalled;
        recallReasons[batchId] = reason;
        totalRecalls++;

        emit BatchRecalled(batchId, reason, block.timestamp);
        emit BatchTransferred(batchId, msg.sender, address(0), "MANUFACTURER", "N/A", string(abi.encodePacked("RECALLED: ", reason)), BatchStatus.Recalled);
    }

    // ============================================================
    // DISTRIBUTOR FUNCTIONS
    // ============================================================

    function transferToPharmacy(
        string memory batchId,
        address pharmacy,
        string memory location,
        string memory notes
    )
        external
        override
        onlyDistributor
        whenNotPaused
        nonReentrant
        batchMustExist(batchId)
        notRecalled(batchId)
    {
        // require(
        //     batches[batchId].status == BatchStatus.InTransit,
        //     "MediChain: batch not in InTransit state"
        // );
        // require(
        //     batchOwner[batchId] == msg.sender,
        //     "MediChain: caller is not the batch owner"
        // );
        // require(
        //     roleManager.hasRole(roleManager.PHARMACY_ROLE(), pharmacy),
        //     "MediChain: recipient is not a registered pharmacy"
        // );
        // require(pharmacy != address(0), "MediChain: zero address");

        batches[batchId].status = BatchStatus.AtPharmacy;
        batchOwner[batchId] = pharmacy;
        totalTransfers++;

        emit BatchTransferred(batchId, msg.sender, pharmacy, "DISTRIBUTOR", location, notes, BatchStatus.AtPharmacy);
    }

    // ============================================================
    // PHARMACY FUNCTIONS
    // ============================================================

    function dispenseUnits(string memory batchId, uint256 units)
        external
        override
        onlyPharmacy
        whenNotPaused
        nonReentrant
        batchMustExist(batchId)
        notRecalled(batchId)
    {
        // require(
        //     batches[batchId].status == BatchStatus.AtPharmacy || batches[batchId].status == BatchStatus.Sold,
        //     "MediChain: batch not at pharmacy"
        // );
        // require(
        //     batchOwner[batchId] == msg.sender,
        //     "MediChain: caller is not the batch owner"
        // );
        // require(units > 0, "MediChain: units must be > 0");
        // require(
        //     batches[batchId].dispensedCount + units <= batches[batchId].quantity,
        //     "MediChain: not enough units left in batch"
        // );

        batches[batchId].dispensedCount += units;
        
        if (batches[batchId].dispensedCount == batches[batchId].quantity) {
             batches[batchId].status = BatchStatus.Sold;
             emit BatchTransferred(batchId, msg.sender, address(0), "PHARMACY", "Pharmacy Counter", "Entire Batch Dispensed", BatchStatus.Sold);
        }

        totalTransfers++;
        emit BatchDispensed(batchId, msg.sender, units, block.timestamp);
    }

    // ============================================================
    // PUBLIC VIEW FUNCTIONS
    // ============================================================

    function verifyBatch(string memory batchId)
        external
        view
        override
        returns (MedicineBatch memory batch)
    {
        require(batches[batchId].exists, "MediChain: batch not found");
        return batches[batchId];
    }

    function isBatchGenuine(string memory batchId)
        external
        view
        override
        returns (bool genuine, string memory status, uint256 lastUpdated)
    {
        if (!batches[batchId].exists) {
            return (false, "NOT_FOUND", block.timestamp);
        }

        MedicineBatch memory b = batches[batchId];

        if (b.status == BatchStatus.Recalled) {
            return (false, "RECALLED", block.timestamp);
        }
        if (b.expiryDate < block.timestamp) {
            return (false, "EXPIRED", block.timestamp);
        }

        string memory statusStr;
        if      (b.status == BatchStatus.Manufactured) statusStr = "MANUFACTURED";
        else if (b.status == BatchStatus.InTransit)    statusStr = "IN_TRANSIT";
        else if (b.status == BatchStatus.AtPharmacy) {
             if(b.dispensedCount > 0) statusStr = "PARTIALLY_DISPENSED";
             else statusStr = "AT_PHARMACY";
        }
        else if (b.status == BatchStatus.Sold)         statusStr = "SOLD";
        else                                           statusStr = "UNKNOWN";

        // Since we removed history mapping, we return block.timestamp.
        // Frontend uses event logs for specific dates.
        return (true, statusStr, block.timestamp);
    }

    function batchExists(string memory batchId) external view override returns (bool) {
        return batches[batchId].exists;
    }

    function getRecallReason(string memory batchId) external view returns (string memory) {
        return recallReasons[batchId];
    }

    function getBatchOwner(string memory batchId) external view returns (address) {
        return batchOwner[batchId];
    }

    function getTotalBatches() external view returns (uint256) {
        return totalBatches;
    }

    function getAllBatchIds() external view returns (string[] memory) {
        return allBatchIds;
    }

    function getBatchIdAt(uint256 index) external view returns (string memory) {
        require(index < allBatchIds.length, "MediChain: index out of bounds");
        return allBatchIds[index];
    }

    function getStats()
        external
        view
        returns (uint256 _totalBatches, uint256 _totalTransfers, uint256 _totalRecalls)
    {
        return (totalBatches, totalTransfers, totalRecalls);
    }

    // ============================================================
    // ADMIN / EMERGENCY FUNCTIONS
    // ============================================================

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
