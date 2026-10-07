# Threat Model & Security Analysis — ChainProof

> **Formal security assumptions, zero-knowledge privacy guarantees, threat vectors, and architectural limitations.**

---

## 1. System Overview & Trust Assumptions

ChainProof enables students to anonymously prove eligibility for scholarships or grants without disclosing their personal identity, specific CGPA, birth date, or financial status. The system relies on:
1. **Poseidon Hash Functions**: Used for zero-knowledge-friendly algebraic hashing in the scalar field of BN254 ($\mathbb{F}_r$).
2. **Groth16 Zero-Knowledge SNARKs**: Providing succinct non-interactive arguments of knowledge with constant-size proofs (3 group elements: $A \in G_1, B \in G_2, C \in G_1$) and ~485,000 gas on-chain verification.
3. **Merkle Trees (Depth 16)**: Supporting trees of up to $2^{16} = 65,536$ students committed into a single 32-byte root.

---

## 2. Public vs. Private Data Boundary

| Data Element | Visibility | Location | Cryptographic Treatment |
|---|---|---|---|
| **Student Secret** (`studentSecret`) | **Private** | Client-only (Credential JSON) | Never revealed. Used as private witness input. |
| **Academic CGPA** (`cgpaScaled`) | **Private** | Client-only (Credential JSON) | Never revealed. Proven in ZK: `cgpaScaled >= minCgpaScaled`. |
| **Department ID** (`deptId`) | **Private** | Client-only (Credential JSON) | Never revealed. Proven in ZK: `deptId == requiredDeptId || requiredDeptId == 0`. |
| **Fee Payment Status** (`feePaid`) | **Private** | Client-only (Credential JSON) | Never revealed. Proven in ZK: `feePaid == 1 || requireFeePaid == 0`. |
| **Birth Year** (`birthYear`) | **Private** | Client-only (Credential JSON) | Never revealed. Proven in ZK: `birthYear <= maxBirthYear`. |
| **Merkle Path & Siblings** | **Private** | Client-only (Credential JSON) | Never revealed. Computed inside the SNARK circuit. |
| **Scholarship ID** (`scholarshipId`) | **Public** | Smart Contract / Public Signals | Public identifier matching the target scholarship rules. |
| **Merkle Root** (`merkleRoot`) | **Public** | Smart Contract / Public Signals | Stored on-chain during scheme creation by Issuer. |
| **Nullifier** (`Poseidon(secret, id)`) | **Public** | Smart Contract / Public Signals | Deterministic one-way hash preventing double claims. |
| **Claiming Recipient Address** | **Public** | Smart Contract / Public Signals | Public Ethereum address receiving scholarship authorization. |
| **Proof Points** ($pA, pB, pC$) | **Public** | Calldata / Transaction Payload | Cryptographic Groth16 elliptic curve points ($G_1, G_2$). |
| **Proof ID** (`proofId`) | **Public** | Contract Event & Storage | Unique 32-byte hash identifying the verification record. |

---

## 3. Detailed Security Threats & Mitigations

### 3.1 Trusted Setup & Toxic Waste
- **Threat**: Groth16 requires a common reference string (CRS) generated via a structured reference string setup. If the discrete log trapdoors ($\tau, \alpha, \beta, \gamma, \delta$) are compromised, an attacker can forge valid zero-knowledge proofs for false statements.
- **Current Demo Status**: ChainProof utilizes a 2-phase setup ceremony (Powers of Tau power 14 + circuit-specific Phase 2) generated locally with random entropy.
- **Production Mitigation**: A production deployment must participate in a community Multi-Party Computation (MPC) ceremony (e.g. Perpetual Powers of Tau) where the trapdoor is destroyed if at least one participant is honest.

### 3.2 Wallet Visibility & On-Chain Recipient Linkability
- **Threat**: The `recipient` address is passed as a public signal and constrained on-chain via `_pubSignals[6] == uint256(uint160(msg.sender))`. The transaction sender is visible in Ethereum blocks.
- **Privacy Analysis**: ChainProof provides **academic data privacy**, not total wallet anonymity. Observers know *that* wallet `0x709...` is eligible for Scholarship #101, but they do *not* know which student owns wallet `0x709...` or what their exact CGPA is.
- **Mitigation for Full Anonymity**: To achieve total untraceability, students can submit their transaction from a fresh, unfunded wallet via an ERC-4337 Account Abstraction paymaster or a gas-sponsoring relayer.

### 3.3 Issuer Correlation & Deanonymization
- **Threat**: In the current architecture, the University Issuer generates the student credentials and knows each student's `studentSecret`. Because the issuer also knows the public `scholarshipId`, the issuer can compute `nullifier = Poseidon(studentSecret, scholarshipId)` for all students in advance.
- **Impact**: When a claim is recorded on-chain, the Issuer can correlate the nullifier back to the student's identity and see which wallet they used.
- **Third-Party Guarantee**: External verifiers, peers, employers, and government agencies *cannot* reverse or link the nullifier.
- **Long-Term Mitigation**: Students could generate their own blinding keys client-side and obtain blind signatures from the university registrar, ensuring even the issuer cannot compute the nullifier.

### 3.4 Front-Running & Mempool Snooping
- **Threat**: An attacker observes a student's Groth16 proof in the Ethereum public mempool and attempts to submit the same proof from their own wallet to steal the grant.
- **Mitigation**: The circuit explicitly binds the student's proof to their Ethereum address:
  ```circom
  signal recipientSquare <== recipient * recipient;
  ```
  The smart contract verifies `_pubSignals[6] == uint256(uint160(msg.sender))`. If an attacker copies the proof and broadcasts it from a different sender address, the contract reverts with `RecipientMismatch()`, and the cryptographic pairing check fails.

### 3.5 Replay Attacks & Double Claiming
- **Threat**: A student attempts to claim the same scholarship award multiple times using their valid credential.
- **Mitigation**: The contract maintains a persistent nullifier registry:
  ```solidity
  if (_usedNullifiers[nullifier]) revert NullifierAlreadyUsed();
  _usedNullifiers[nullifier] = true;
  ```
  Since `nullifier = Poseidon(secret, scholarshipId)` is deterministic, any subsequent attempt reverts with `NullifierAlreadyUsed()`.
  Crucially, participating in a *different* scholarship (e.g. `scholarshipId = 202`) produces a completely different nullifier, allowing legitimate multi-scheme participation without cross-scheme linkability.

### 3.6 Merkle Forgery & Tree Tampering
- **Threat**: A non-eligible student attempts to forge a Merkle tree membership proof or alter their CGPA attribute.
- **Mitigation**: The leaf is calculated as:
  $$\text{leaf} = \text{Poseidon}(\text{studentSecret}, \text{cgpaScaled}, \text{deptId}, \text{birthYear}, \text{feePaid})$$
  Modifying `cgpaScaled` alters the leaf hash, which in turn invalidates the Merkle path computation inside the circuit. The circuit requires:
  $$\text{computedRoot} == \text{merkleRoot}$$
  Since the on-chain registry strictly enforces `_pubSignals[0] == scheme.merkleRoot`, forged credentials cannot verify.

### 3.7 Arithmetic Underflow / Overflow & Range Soundness
- **Threat**: Attackers pass values close to the scalar field prime $r = 21888242871839275222246405745257275088548364400416034343698204186575808495617$ to fool comparative operators (`GreaterEqThan`, `LessEqThan`).
- **Mitigation**: All numeric inputs are constrained to 12 bits ($[0, 4095]$) via `Num2Bits(12)` before comparison. Any value outside this range fails the binary decomposition constraint immediately.

---

## 4. Security Scorecard

| Security Property | Threat Vector | Status | Guarantee Mechanism |
|---|---|---|---|
| **Identity Privacy** | Deanonymization by external verifier | Protected | Groth16 Zero-Knowledge Proof |
| **Grade Privacy** | Academic transcript leakage | Protected | Zero-Knowledge Range Proofs |
| **Front-Running** | Mempool proof theft | Protected | Recipient signal bound to `msg.sender` |
| **Double Claiming** | Multi-claiming on single scholarship | Protected | Deterministic nullifier registry |
| **Cross-Scheme Unlinkability**| Tracking a student across schemes | Protected | Salted nullifier $H(\text{secret}, \text{id})$ |
| **Credential Tampering** | Falsifying CGPA or fee status | Protected | Poseidon Merkle root commitment |
| **Unauthorized Scheme Creation** | Malicious scheme injection | Protected | OpenZeppelin `AccessControl` (`ISSUER_ROLE`) |
| **Wallet Anonymity** | Blockchain address tracking | Partial | Mitigated via fresh addresses or relayers |
| **Issuer Linkability** | Deanonymization by issuing college | Known Trade-off | Documented trust model; future blind sigs |
