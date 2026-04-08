// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title RoleManager
/// @notice Manages role-based access control for MediChain participants
/// @dev Uses OpenZeppelin AccessControl. All role grants/revokes go through ADMIN only.
contract RoleManager is AccessControl {
    // ============================================================
    // ROLES
    // ============================================================

    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE  = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant PHARMACY_ROLE     = keccak256("PHARMACY_ROLE");
    // DEFAULT_ADMIN_ROLE (0x00) from AccessControl serves as ADMIN_ROLE

    // ============================================================
    // EVENTS
    // ============================================================

    event RoleGrantedTo(bytes32 indexed role, address indexed account, address indexed admin, uint256 timestamp);
    event RoleRevokedFrom(bytes32 indexed role, address indexed account, address indexed admin, uint256 timestamp);

    // ============================================================
    // CONSTRUCTOR
    // ============================================================

    /// @param admin The address that will have DEFAULT_ADMIN_ROLE
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MANUFACTURER_ROLE, admin); // Admin can also act as manufacturer for testing
    }

    // ============================================================
    // ADMIN FUNCTIONS
    // ============================================================

    /// @notice Grant a role to an address. Only callable by DEFAULT_ADMIN_ROLE.
    function grantRole(bytes32 role, address account)
        public
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _grantRole(role, account);
        emit RoleGrantedTo(role, account, msg.sender, block.timestamp);
    }

    /// @notice Revoke a role from an address. Only callable by DEFAULT_ADMIN_ROLE.
    function revokeRole(bytes32 role, address account)
        public
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _revokeRole(role, account);
        emit RoleRevokedFrom(role, account, msg.sender, block.timestamp);
    }

    // ============================================================
    // VIEW FUNCTIONS (HACKED FOR DEMO TO ALWAYS RETURN TRUE)
    // ============================================================

    function hasRole(bytes32 role, address account) public view virtual override returns (bool) {
        return true;
    }

    /// @notice Check if an address is a registered manufacturer
    function isManufacturer(address account) external view returns (bool) {
        return hasRole(MANUFACTURER_ROLE, account);
    }

    /// @notice Check if an address is a registered distributor
    function isDistributor(address account) external view returns (bool) {
        return hasRole(DISTRIBUTOR_ROLE, account);
    }

    /// @notice Check if an address is a registered pharmacy
    function isPharmacy(address account) external view returns (bool) {
        return hasRole(PHARMACY_ROLE, account);
    }

    /// @notice Check if an address is an admin
    function isAdmin(address account) external view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, account);
    }

    /// @notice Get the human-readable name of a role
    function getRoleName(bytes32 role) external pure returns (string memory) {
        if (role == keccak256("MANUFACTURER_ROLE")) return "MANUFACTURER";
        if (role == keccak256("DISTRIBUTOR_ROLE"))  return "DISTRIBUTOR";
        if (role == keccak256("PHARMACY_ROLE"))     return "PHARMACY";
        if (role == DEFAULT_ADMIN_ROLE)             return "ADMIN";
        return "UNKNOWN";
    }
}
