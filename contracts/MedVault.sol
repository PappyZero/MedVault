// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title MedVault
 * @author MedVault Team
 * @notice Emergency Medical Record Access System with granular, patient-controlled access.
 * @dev Stores encrypted medical record CIDs on IPFS with permissioned access and audit logging.
 *      This contract is upgradeable and includes reentrancy protection.
 */
contract MedVault is Initializable, ReentrancyGuardUpgradeable {
    // ============================================
    // State Variables
    // ============================================

    /// @notice Mapping of patient address to their encrypted record CID
    mapping(address => string) private records;

    /// @notice Mapping of patient => grantee => access permission
    mapping(address => mapping(address => bool)) private accessPermissions;

    /// @notice Mapping of patient => grantee => wrapped AES key (encrypted for grantee)
    mapping(address => mapping(address => bytes)) private encryptedSymKeys;

    /// @notice Tracks if a patient has uploaded a record
    mapping(address => bool) public hasRecord;

    // ============================================
    // Events
    // ============================================

    /**
     * @notice Emitted when a patient uploads a new medical record
     * @param patient Address of the patient uploading the record
     * @param cid IPFS content identifier of the encrypted record
     * @param timestamp Block timestamp of the upload
     */
    event RecordUploaded(
        address indexed patient,
        string cid,
        uint256 timestamp
    );

    /**
     * @notice Emitted when access permissions are modified
     * @param patient Address of the patient (record owner)
     * @param grantee Address of the paramedic/doctor receiving or losing access
     * @param granted True if access granted, false if revoked
     * @param timestamp Block timestamp of the permission change
     */
    event AccessUpdated(
        address indexed patient,
        address indexed grantee,
        bool granted,
        uint256 timestamp
    );

    /**
     * @notice Emitted on every access attempt (successful or denied)
     * @param accessor Address attempting to access the record
     * @param patient Address of the patient (record owner)
     * @param cid The CID that was accessed (empty if access was denied)
     * @param success Whether access was granted (true) or denied (false)
     * @param timestamp Block timestamp of the access attempt
     */
    event AccessAttempt(
        address indexed accessor,
        address indexed patient,
        string cid,
        bool success,
        uint256 timestamp
    );

    // ============================================
    // Initialization
    // ============================================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ReentrancyGuard_init();
    }

    // ============================================
    // Modifiers
    // ============================================

    /**
     * @notice Ensures the caller is the patient (record owner)
     * @param patient Address of the patient
     */
    modifier onlyPatient(address patient) {
        require(msg.sender == patient, "MedVault: caller is not the patient");
        _;
    }

    /**
     * @notice Ensures the patient has uploaded a record
     * @param patient Address of the patient
     */
    modifier patientHasRecord(address patient) {
        require(hasRecord[patient], "MedVault: patient has no record");
        _;
    }

    // ============================================
    // Core Functions
    // ============================================

    /**
     * @notice Upload encrypted medical record CID
     * @dev Only the patient can upload their own record
     * @param cid IPFS content identifier of the encrypted medical record
     *
     * Requirements:
     * - CID must not be empty
     * - Patient can update their record by calling this again
     */
    function uploadRecord(string calldata cid) 
        external 
        nonReentrant 
    {
        require(bytes(cid).length > 0, "MedVault: CID cannot be empty");

        records[msg.sender] = cid;
        hasRecord[msg.sender] = true;

        emit RecordUploaded(msg.sender, cid, block.timestamp);
    }

    /**
     * @notice Grant access to multiple paramedics or doctors
     * @dev Only the patient can grant access to their record
     * @param grantees Array of addresses to grant access to
     * @param wrappedKeys Array of AES keys encrypted for each grantee's public key
     *
     * Requirements:
     * - Caller must be the patient
     * - Patient must have uploaded a record
     * - Grantee addresses must not be zero
     * - Wrapped keys must not be empty
     * - Arrays must be of equal length
     */
    function batchGrantAccess(
        address[] calldata grantees,
        bytes[] calldata wrappedKeys
    ) 
        external 
        onlyPatient(msg.sender) 
        patientHasRecord(msg.sender)
        nonReentrant
    {
        require(grantees.length == wrappedKeys.length, "MedVault: array length mismatch");
        require(grantees.length > 0, "MedVault: empty input arrays");

        for (uint256 i = 0; i < grantees.length; i++) {
            _grantAccess(grantees[i], wrappedKeys[i]);
        }
    }

    /**
     * @notice Grant access to a paramedic or doctor
     * @dev Only the patient can grant access to their record
     * @param grantee Address of the paramedic/doctor to grant access
     * @param wrappedKey AES key encrypted for the grantee's public key
     */
    function grantAccess(
        address grantee, 
        bytes calldata wrappedKey
    ) 
        external 
        onlyPatient(msg.sender) 
        patientHasRecord(msg.sender)
        nonReentrant
    {
        _grantAccess(grantee, wrappedKey);
    }

    /**
     * @notice Internal function to handle access granting
     * @param grantee Address to grant access to
     * @param wrappedKey Encrypted AES key for the grantee
     */
    function _grantAccess(
        address grantee,
        bytes calldata wrappedKey
    ) 
        internal 
    {
        require(grantee != address(0), "MedVault: invalid grantee address");
        require(wrappedKey.length > 0, "MedVault: wrapped key cannot be empty");

        accessPermissions[msg.sender][grantee] = true;
        encryptedSymKeys[msg.sender][grantee] = wrappedKey;

        emit AccessUpdated(msg.sender, grantee, true, block.timestamp);
    }

    /**
     * @notice Revoke access from multiple previously authorized parties
     * @param grantees Array of addresses to revoke access from
     */
    function batchRevokeAccess(
        address[] calldata grantees
    ) 
        external 
        onlyPatient(msg.sender)
        patientHasRecord(msg.sender)
        nonReentrant
    {
        require(grantees.length > 0, "MedVault: empty input array");

        for (uint256 i = 0; i < grantees.length; i++) {
            _revokeAccess(grantees[i]);
        }
    }

    /**
     * @notice Revoke access from a previously authorized party
     * @param grantee Address of the party to revoke access from
     */
    function revokeAccess(
        address grantee
    ) 
        external 
        onlyPatient(msg.sender)
        patientHasRecord(msg.sender)
        nonReentrant
    {
        _revokeAccess(grantee);
    }

    /**
     * @notice Internal function to handle access revocation
     * @param grantee Address to revoke access from
     */
    function _revokeAccess(
        address grantee
    ) 
        internal 
    {
        require(grantee != address(0), "MedVault: invalid grantee address");

        if (accessPermissions[msg.sender][grantee]) {
            accessPermissions[msg.sender][grantee] = false;
            delete encryptedSymKeys[msg.sender][grantee];

            emit AccessUpdated(msg.sender, grantee, false, block.timestamp);
        }
    }

    /**
     * @notice Access a patient's medical record
     * @dev Emits AccessAttempt event for audit trail
     * @param patient Address of the patient whose record to access
     * @return cid IPFS content identifier of the encrypted record
     */
    function getRecord(
        address patient
    )
        external
        patientHasRecord(patient)
        nonReentrant
        returns (string memory cid)
    {
        string memory recordCid = records[patient];
        bool hasAccess = (msg.sender == patient) || accessPermissions[patient][msg.sender];

        emit AccessAttempt(
            msg.sender,
            patient,
            hasAccess ? recordCid : "",
            hasAccess,
            block.timestamp
        );

        require(hasAccess, "MedVault: access denied");
        return recordCid;
    }

    /**
     * @notice Get the wrapped AES key for a grantee
     * @param patient Address of the patient (record owner)
     * @return wrappedKey The AES key encrypted for the caller
     */
    function getWrappedKey(
        address patient
    )
        external
        view
        patientHasRecord(patient)
        returns (bytes memory wrappedKey)
    {
        require(
            accessPermissions[patient][msg.sender],
            "MedVault: no access permission"
        );

        return encryptedSymKeys[patient][msg.sender];
    }

    /**
     * @notice Check if an address has access to a patient's record
     * @param patient Address of the patient
     * @param accessor Address to check access for
     * @return bool True if accessor has permission, false otherwise
     */
    function checkAccess(
        address patient, 
        address accessor
    )
        external
        view
        returns (bool)
    {
        return (accessor == patient) || accessPermissions[patient][accessor];
    }

    /**
     * @notice Get the record CID for a patient (view only, no audit event)
     * @param patient Address of the patient
     * @return cid The IPFS content identifier
     */
    function getRecordCID(
        address patient
    )
        external
        view
        onlyPatient(patient)
        patientHasRecord(patient)
        returns (string memory cid)
    {
        return records[patient];
    }
}