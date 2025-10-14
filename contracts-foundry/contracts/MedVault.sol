// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title MedVault
 * @author MedVault Team
 * @notice Emergency Medical Record Access System with granular access control
 * @dev Stores encrypted medical record CIDs on BlockDAG with patient-controlled access
 *
 * Security Features:
 * - Patient-only upload and access control
 * - Granular permission management
 * - Complete audit trail via events
 * - Revocable access grants
 *
 * Usage Flow:
 * 1. Patient uploads encrypted record CID via uploadRecord()
 * 2. Patient grants access to paramedics/doctors via grantAccess()
 * 3. Authorized parties access records via getRecord()
 * 4. Patient can revoke access via revokeAccess()
 * 5. All actions logged via events for audit trail
 */
contract MedVault {

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
     * @param grantee Address of the paramedic/doctor receiving access
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
     * @param success Whether access was granted (true) or denied (false)
     * @param timestamp Block timestamp of the access attempt
     */
    event AccessAttempt(
        address indexed accessor,
        address indexed patient,
        bool success,
        uint256 timestamp
    );

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
    function uploadRecord(string calldata cid) external {
        require(bytes(cid).length > 0, "MedVault: CID cannot be empty");

        records[msg.sender] = cid;
        hasRecord[msg.sender] = true;

        emit RecordUploaded(msg.sender, cid, block.timestamp);
    }

    /**
     * @notice Grant access to a paramedic or doctor
     * @dev Only the patient can grant access to their record
     * @param grantee Address of the paramedic/doctor to grant access
     * @param wrappedKey AES key encrypted for the grantee's public key
     *
     * Requirements:
     * - Patient must have uploaded a record
     * - Grantee address must not be zero
     * - Wrapped key must not be empty
     */
    function grantAccess(address grantee, bytes calldata wrappedKey)
        external
        onlyPatient(msg.sender)
        patientHasRecord(msg.sender)
    {
        require(grantee != address(0), "MedVault: invalid grantee address");
        require(wrappedKey.length > 0, "MedVault: wrapped key cannot be empty");

        accessPermissions[msg.sender][grantee] = true;
        encryptedSymKeys[msg.sender][grantee] = wrappedKey;

        emit AccessUpdated(msg.sender, grantee, true, block.timestamp);
    }

    /**
     * @notice Revoke access from a previously authorized party
     * @dev Only the patient can revoke access to their record
     * @param grantee Address of the party to revoke access from
     *
     * Requirements:
     * - Patient must have uploaded a record
     * - Grantee address must not be zero
     */
    function revokeAccess(address grantee)
        external
        onlyPatient(msg.sender)
        patientHasRecord(msg.sender)
    {
        require(grantee != address(0), "MedVault: invalid grantee address");

        accessPermissions[msg.sender][grantee] = false;
        delete encryptedSymKeys[msg.sender][grantee];

        emit AccessUpdated(msg.sender, grantee, false, block.timestamp);
    }

    /**
     * @notice Access a patient's medical record
     * @dev Emits AccessAttempt event for audit trail
     * @param patient Address of the patient whose record to access
     * @return cid IPFS content identifier of the encrypted record
     *
     * Requirements:
     * - Patient must have a record
     * - Caller must be either the patient or have granted access
     */
    function getRecord(address patient)
        external
        patientHasRecord(patient)
        returns (string memory cid)
    {
        bool hasAccess = (msg.sender == patient) || accessPermissions[patient][msg.sender];

        emit AccessAttempt(msg.sender, patient, hasAccess, block.timestamp);

        require(hasAccess, "MedVault: access denied");

        return records[patient];
    }

    /**
     * @notice Get the wrapped AES key for a grantee
     * @dev Only callable by the grantee to retrieve their wrapped key
     * @param patient Address of the patient (record owner)
     * @return wrappedKey The AES key encrypted for the caller
     *
     * Requirements:
     * - Patient must have a record
     * - Caller must have access to the patient's record
     */
    function getWrappedKey(address patient)
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
    function checkAccess(address patient, address accessor)
        external
        view
        returns (bool)
    {
        return (accessor == patient) || accessPermissions[patient][accessor];
    }

    /**
     * @notice Get the record CID for a patient (view only, no audit event)
     * @dev This is a convenience function for the patient to view their own CID
     * @param patient Address of the patient
     * @return cid The IPFS content identifier
     *
     * Requirements:
     * - Only callable by the patient themselves
     * - Patient must have a record
     */
    function getRecordCID(address patient)
        external
        view
        onlyPatient(patient)
        patientHasRecord(patient)
        returns (string memory cid)
    {
        return records[patient];
    }
}
