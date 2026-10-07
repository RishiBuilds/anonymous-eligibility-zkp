// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IGroth16Verifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[8] calldata _pubSignals
    ) external view returns (bool);
}

contract EligibilityRegistry is AccessControl, ReentrancyGuard {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    error SchemeAlreadyExists();
    error SchemeNotFound();
    error SchemeInactive();
    error NullifierAlreadyUsed();
    error RecipientMismatch();
    error InvalidProof();
    error SchemeParamsMismatch();
    error InvalidVerifier();

    struct Scheme {
        bytes32 merkleRoot;
        uint256 minCgpaScaled;
        uint256 requiredDeptId;
        uint256 requireFeePaid;
        uint256 maxBirthYear;
        string  metadataURI;
        address issuer;
        bool    active;
        bool    exists;
    }

    struct Verification {
        bytes32 proofId;
        bytes32 nullifier;
        address recipient;
        address issuer;
        uint256 scholarshipId;
        uint256 timestamp;
        bool    valid;
    }

    IGroth16Verifier public immutable verifier;

    mapping(uint256 => Scheme) private _schemes;
    mapping(bytes32 => bool)   private _usedNullifiers;
    mapping(bytes32 => Verification) private _verifications;
    uint256 private _verificationCount;

    event SchemeCreated(uint256 indexed scholarshipId, address indexed issuer, bytes32 merkleRoot);
    event SchemeRevoked(uint256 indexed scholarshipId, address indexed issuer);
    event EligibilityVerified(
        bytes32 indexed proofId,
        uint256 indexed scholarshipId,
        address indexed recipient,
        bytes32 nullifier,
        bool    valid
    );

    constructor(address _verifier) {
        if (_verifier == address(0) || _verifier.code.length == 0) revert InvalidVerifier();
        verifier = IGroth16Verifier(_verifier);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
    }

    function createScheme(
        uint256 scholarshipId,
        bytes32 merkleRoot,
        uint256 minCgpaScaled,
        uint256 requiredDeptId,
        uint256 requireFeePaid,
        uint256 maxBirthYear,
        string  calldata metadataURI
    ) external onlyRole(ISSUER_ROLE) {
        if (_schemes[scholarshipId].exists) revert SchemeAlreadyExists();

        _schemes[scholarshipId] = Scheme({
            merkleRoot:      merkleRoot,
            minCgpaScaled:   minCgpaScaled,
            requiredDeptId:  requiredDeptId,
            requireFeePaid:  requireFeePaid,
            maxBirthYear:    maxBirthYear,
            metadataURI:     metadataURI,
            issuer:          msg.sender,
            active:          true,
            exists:          true
        });

        emit SchemeCreated(scholarshipId, msg.sender, merkleRoot);
    }

    function revokeScheme(uint256 scholarshipId) external onlyRole(ISSUER_ROLE) {
        Scheme storage s = _schemes[scholarshipId];
        if (!s.exists)  revert SchemeNotFound();
        if (!s.active)  revert SchemeInactive();

        s.active = false;
        emit SchemeRevoked(scholarshipId, msg.sender);
    }

    function verifyAndRecord(
        uint[2]   calldata _pA,
        uint[2][2] calldata _pB,
        uint[2]   calldata _pC,
        uint[8]   calldata _pubSignals
    ) external nonReentrant returns (bytes32 proofId) {
        uint256 scholarshipId = _pubSignals[1];
        Scheme storage s = _schemes[scholarshipId];

        if (!s.exists)  revert SchemeNotFound();
        if (!s.active)  revert SchemeInactive();

        if (_pubSignals[0] != uint256(s.merkleRoot))    revert SchemeParamsMismatch();
        if (_pubSignals[2] != s.minCgpaScaled)          revert SchemeParamsMismatch();
        if (_pubSignals[3] != s.requiredDeptId)          revert SchemeParamsMismatch();
        if (_pubSignals[4] != s.requireFeePaid)          revert SchemeParamsMismatch();
        if (_pubSignals[5] != s.maxBirthYear)            revert SchemeParamsMismatch();

        if (_pubSignals[6] != uint256(uint160(msg.sender))) revert RecipientMismatch();

        bytes32 nullHash = bytes32(_pubSignals[7]);
        if (_usedNullifiers[nullHash]) revert NullifierAlreadyUsed();

        bool valid = verifier.verifyProof(_pA, _pB, _pC, _pubSignals);
        if (!valid) revert InvalidProof();

        _usedNullifiers[nullHash] = true;
        _verificationCount++;

        proofId = keccak256(abi.encodePacked(
            scholarshipId, msg.sender, nullHash, block.timestamp, _verificationCount
        ));

        _verifications[proofId] = Verification({
            proofId:       proofId,
            nullifier:     nullHash,
            recipient:     msg.sender,
            issuer:        s.issuer,
            scholarshipId: scholarshipId,
            timestamp:     block.timestamp,
            valid:         valid
        });

        emit EligibilityVerified(proofId, scholarshipId, msg.sender, nullHash, valid);
    }

    function isNullifierUsed(bytes32 nullHash) external view returns (bool) {
        return _usedNullifiers[nullHash];
    }

    function getVerification(bytes32 proofId) external view returns (Verification memory) {
        return _verifications[proofId];
    }

    function getScheme(uint256 scholarshipId) external view returns (Scheme memory) {
        return _schemes[scholarshipId];
    }
}
