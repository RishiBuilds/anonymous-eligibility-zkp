import "./polyfill.js";
import * as snarkjs from "snarkjs";
import { buildPoseidon } from "circomlibjs";

let poseidonInstance = null;

async function getPoseidon() {
  if (!poseidonInstance) {
    poseidonInstance = await buildPoseidon();
  }
  return poseidonInstance;
}

self.onmessage = async (e) => {
  const { type, circuitInput, wasmUrl, zkeyUrl } = e.data;

  if (type === "GENERATE_PROOF") {
    try {
      self.postMessage({
        status: "PROGRESS",
        step: 1,
        message: "Deriving anonymous scholarship nullifier..."
      });

      const poseidon = await getPoseidon();
      const F = poseidon.F;
      const secretBigInt = BigInt(circuitInput.studentSecret);
      const scholarshipBigInt = BigInt(circuitInput.scholarshipId);
      const nullifierHash = poseidon([secretBigInt, scholarshipBigInt]);
      circuitInput.nullifier = F.toObject(nullifierHash).toString();

      self.postMessage({
        status: "PROGRESS",
        step: 2,
        message: "Computing private witness in WASM..."
      });

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInput,
        wasmUrl,
        zkeyUrl
      );

      self.postMessage({
        status: "PROGRESS",
        step: 3,
        message: "Formatting Solidity calldata parameters..."
      });

      const calldataStr = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
      const formatted = JSON.parse(`[${calldataStr}]`);

      self.postMessage({
        status: "SUCCESS",
        proof,
        publicSignals,
        calldata: {
          pA: formatted[0],
          pB: formatted[1],
          pC: formatted[2],
          pubSignals: formatted[3]
        }
      });
    } catch (err) {
      console.error("ZK Worker Error:", err);
      self.postMessage({
        status: "ERROR",
        error: err.message || "Failed to generate zero-knowledge proof"
      });
    }
  }
};
