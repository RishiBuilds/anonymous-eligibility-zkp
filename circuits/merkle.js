const { buildPoseidon } = require("circomlibjs");

let poseidonInstance = null;

async function getPoseidon() {
  if (!poseidonInstance) {
    poseidonInstance = await buildPoseidon();
  }
  return poseidonInstance;
}

class PoseidonMerkleTree {
  constructor(depth = 16) {
    this.depth = depth;
    this.leaves = [];
    this.zeroes = [];
  }

  async init() {
    const poseidon = await getPoseidon();
    const F = poseidon.F;

    this.zeroes = [0n];
    for (let i = 1; i <= this.depth; i++) {
      const h = poseidon([this.zeroes[i - 1], this.zeroes[i - 1]]);
      this.zeroes.push(BigInt(F.toString(h)));
    }
  }

  insert(leaf) {
    this.leaves.push(BigInt(leaf));
    return this.leaves.length - 1;
  }

  async getProof(index) {
    const poseidon = await getPoseidon();
    const F = poseidon.F;

    if (this.zeroes.length === 0) {
      await this.init();
    }

    let currentLevel = new Map();
    for (let i = 0; i < this.leaves.length; i++) {
      currentLevel.set(i, this.leaves[i]);
    }

    const pathElements = [];
    const pathIndices = [];
    let currentIndex = index;

    for (let level = 0; level < this.depth; level++) {
      const isRight = currentIndex % 2 === 1;
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;
      const siblingValue = currentLevel.has(siblingIndex)
        ? currentLevel.get(siblingIndex)
        : this.zeroes[level];

      pathElements.push(siblingValue.toString());
      pathIndices.push(isRight ? 1 : 0);

      const nextLevel = new Map();
      for (const [idx, val] of currentLevel.entries()) {
        const parentIdx = Math.floor(idx / 2);
        if (!nextLevel.has(parentIdx)) {
          const leftIdx = parentIdx * 2;
          const rightIdx = leftIdx + 1;
          const leftVal = currentLevel.has(leftIdx) ? currentLevel.get(leftIdx) : this.zeroes[level];
          const rightVal = currentLevel.has(rightIdx) ? currentLevel.get(rightIdx) : this.zeroes[level];
          const parentHash = poseidon([leftVal, rightVal]);
          nextLevel.set(parentIdx, BigInt(F.toString(parentHash)));
        }
      }
      currentLevel = nextLevel;
      currentIndex = Math.floor(currentIndex / 2);
    }

    const root = (currentLevel.get(0) ?? this.zeroes[this.depth]).toString();
    return { root, pathElements, pathIndices };
  }
}

module.exports = { PoseidonMerkleTree, getPoseidon };
