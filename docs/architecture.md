# Architecture — ChainProof (anonymous-eligibility-zkp)

> Built in Phase 7. This document describes the system architecture.

## High-Level Flow

```
┌──────────┐    CSV of       ┌──────────────┐     Merkle root      ┌──────────────┐
│  College │  ─────────────► │ Issuer Script │  ──────────────────► │  Smart       │
│ (Issuer) │   students      │ (build_tree)  │   createScheme()     │  Contract    │
└──────────┘                 └──────┬───────┘                      └──────┬───────┘
                                    │                                     │
                        credential  │                         verifyProof │
                          files     │                                     │
                                    ▼                                     │
                             ┌──────────────┐    proof + tx               │
                             │   Student    │  ──────────────────────────►│
                             │   Browser    │    verifyAndRecord()        │
                             └──────────────┘                            │
                                                                         │
                             ┌──────────────┐                            │
                             │   Verifier   │  ◄────── getVerification() │
                             │   (anyone)   │         view only          │
                             └──────────────┘
```

## Components

1. **Circom Circuit** — `circuits/eligibility.circom`
2. **Smart Contracts** — `contracts/EligibilityRegistry.sol` + generated `Groth16Verifier.sol`
3. **Issuer Scripts** — `scripts/build_tree.js`, `scripts/generate_students.js`
4. **Frontend** — React (Vite) app in `frontend/`

## Privacy Guarantees

- The Merkle root is the ONLY data published on-chain from the student set
- Proofs are zero-knowledge: the verifier learns nothing about the student
- Nullifiers prevent double-claiming without revealing identity
- Recipient binding prevents front-running
