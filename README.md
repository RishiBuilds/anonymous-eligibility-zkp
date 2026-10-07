<div align="center">

# ChainProof

**Prove you qualify. Keep your identity.**

Anonymous scholarship eligibility verification on Ethereum using Groth16 zero-knowledge proofs and Poseidon Merkle trees.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Circom](https://img.shields.io/badge/Circom-2.1.9-3fb950.svg)](https://docs.circom.io/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-e8590c.svg)](https://soliditylang.org/)
[![Frontend](https://img.shields.io/badge/Frontend-Vite%20%2B%20React-8957e5.svg)](https://vitejs.dev/)

[Overview](#overview) | [How It Works](#how-it-works) | [Privacy Model](#privacy-model) | [Quick Start](#quick-start) | [Demo](#demo-walkthrough) | [Specs](#technical-specifications) | [Security](#security-and-limitations)

</div>

---

## Overview

A student should be able to show they meet scholarship criteria without handing over their transcript, finances, or birthdate.

ChainProof makes that possible. A student generates a zero-knowledge proof in the browser showing they satisfy rules such as:

- CGPA at or above a minimum (e.g. 8.00)
- Enrolled in a specific department
- Tuition fee cleared
- Born on or before a cutoff year

The smart contract verifies the proof in constant time (about 485k gas), checks membership in the university's Merkle tree, blocks double claims with a nullifier, and stores only an anonymous verification receipt.

---

## How It Works

```
   UNIVERSITY (ISSUER)                                  STUDENT (BROWSER)
          |                                                    |
  1. Build Poseidon Merkle tree of eligible students           |
  2. Publish root on-chain (createScheme)                      |
          |                                                    |
          +------- credential file (STU001.credential.json) -->|
                                                               |
                                            3. Client-side pre-check
                                            4. Web Worker generates Groth16 proof
                                               (nullifier + witness computed locally)
                                                               |
                                            5. Submit verifyAndRecord()
                                                               |
                                                               v
                                                     SMART CONTRACT
                                          - Merkle root and criteria match scheme
                                          - recipient == msg.sender
                                          - nullifier unused
                                          - Groth16 pairing check passes
                                          - nullifier marked spent, event emitted
                                                               |
                                                               v
                                                    VERIFIER (anyone)
                                          Queries proofId on-chain: VALID
```

---

## Privacy Model

| Data | Visibility | Treatment |
|---|---|---|
| Student secret | Private | Circuit witness; never leaves the browser |
| Exact CGPA | Private | Proven in ZK: `cgpaScaled >= minCgpaScaled` |
| Department ID | Private | Proven in ZK: matches criteria or wildcard |
| Fee paid | Private | Proven in ZK: `feePaid == 1` |
| Birth year | Private | Proven in ZK: `birthYear <= maxBirthYear` |
| Merkle path | Private | Private witness for membership |
| Scholarship ID | Public | Identifies the scheme |
| Merkle root | Public | Commitment to the eligible student set |
| Nullifier | Public | `Poseidon(secret, id)`; prevents double claiming |
| Recipient address | Public | Bound to the proof to prevent front-running |
| Proof points (pA, pB, pC) | Public | BN254 curve points in calldata |
| Proof ID | Public | 32-byte hash of the verification record |

---

## Quick Start

**Requirements:** Node.js 18+, Git, and MetaMask (optional; the app includes one-click local accounts).

**1. Install**

```bash
git clone https://github.com/RishiBuilds/anonymous-eligibility-zkp.git
cd anonymous-eligibility-zkp

npm install
cd frontend && npm install && cd ..
```

**2. Build the circuit and run the trusted setup**

```bash
npm run build:circuit
npm run setup
```

**3. Start a local chain, deploy, and generate demo credentials**

```bash
# Terminal 1
npm run node

# Terminal 2
npm run compile
npm run deploy:local
npm run issuer:build      # 20 demo credentials + Merkle tree
```

**4. Launch the app**

```bash
# Terminal 3
npm run frontend          # http://localhost:5173
```

For a production build: `cd frontend && npm run build && npm run preview -- --port 4173`

---

## Demo Walkthrough

A five-minute end-to-end run. Use the in-app account switcher or MetaMask.

**1. Issuer creates a scheme**
Connect as Account #0, open **Issuer Dashboard**, set Scholarship ID `101`, click **Load from merkle_root.json**, then set Min CGPA `8.00`, Dept `1 (Computer Science)`, Require Fee Paid, Max Birth Year `2002`. Publish on-chain.

**2. Student proves eligibility**
Switch to Account #1 (Student STU001), open **Student Portal**, select scheme `101`, and upload `credentials/STU001.credential.json`. The pre-check turns green for all four criteria. Click **Generate Zero-Knowledge Proof** (about 8-12 seconds), then **Submit Proof to Smart Contract**.

**3. Verifier audits the proof**
Open the Verifier tab from the success card. The page shows **ELIGIBILITY VERIFIED: VALID**, with only the recipient address, scheme number, timestamp, and nullifier status. No name, ID, CGPA, birthdate, or fee record is exposed.

**4. Security checks**

| Attempt | Result |
|---|---|
| Submit the same credential twice | Reverts with `NullifierAlreadyUsed()` |
| Upload an ineligible credential (e.g. CGPA 7.20) | Pre-check flags it; proving fails on constraint check |
| Switch wallet after proving | UI detects mismatch and requires re-proving |
| Non-issuer opens Issuer Dashboard | Blocked: missing `ISSUER_ROLE` |

---

## Technical Specifications

| Parameter | Value |
|---|---|
| Proving system | Groth16 |
| Curve | BN254 (alt_bn128), using Ethereum precompiles `0x06`, `0x07`, `0x08` |
| Hash | Poseidon |
| Merkle tree depth | 16 levels (up to 65,536 students) |
| Constraints | 4,622 total (4,614 non-linear) |
| Public signals | 8 (root, scholarshipId, 4 criteria, recipient, nullifier) |
| Verification gas | ~485k, measured from transaction receipts |
| Proof size | 256 bytes, independent of database size |

---

## Security and Limitations

Full details are in [docs/threat-model.md](docs/threat-model.md).

- **Recipient visibility:** The claiming address is public on-chain. Wallet-level unlinkability requires a relayer or an ERC-4337 paymaster.
- **Issuer correlation:** The university issues the secrets, so it can link nullifiers to students. Third parties cannot.
- **Trusted setup:** The repository uses a single-contributor demo ceremony. Production deployments need a multi-party computation ceremony.

---

## License

Released under the [MIT License](LICENSE).