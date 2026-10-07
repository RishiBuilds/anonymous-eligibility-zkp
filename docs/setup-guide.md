# Setup Guide — ChainProof

> Completed in Phase 7. Step-by-step instructions to build and run the project.

## Prerequisites

- Node.js >= 18
- Circom 2.x compiler (`circom` in PATH)
- Git
- MetaMask browser extension

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/RishiBuilds/anonymous-eligibility-zkp.git
cd anonymous-eligibility-zkp
npm install

# 2. Compile the circuit and run trusted setup
npm run build:circuit
npm run setup

# 3. Compile contracts (after setup generates Groth16Verifier.sol)
npm run compile

# 4. Run tests
npm test

# 5. Start local node
npm run node

# 6. Deploy contracts (in another terminal)
npm run deploy:local

# 7. Generate dummy students and build Merkle tree
npm run generate:students
npm run build:tree

# 8. Start frontend
cd frontend
npm install
npm run dev
```
