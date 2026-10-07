pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/mux1.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

template PoseidonMerkleProof(depth) {
    signal input leaf;
    signal input pathElements[depth];
    signal input pathIndices[depth];   // 0 = left, 1 = right
    signal output root;

    signal hashes[depth + 1];
    hashes[0] <== leaf;

    component hashers[depth];
    component muxLeft[depth];
    component muxRight[depth];

    for (var i = 0; i < depth; i++) {
        pathIndices[i] * (1 - pathIndices[i]) === 0;

        muxLeft[i] = Mux1();
        muxLeft[i].c[0] <== hashes[i];
        muxLeft[i].c[1] <== pathElements[i];
        muxLeft[i].s <== pathIndices[i];

        muxRight[i] = Mux1();
        muxRight[i].c[0] <== pathElements[i];
        muxRight[i].c[1] <== hashes[i];
        muxRight[i].s <== pathIndices[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== muxLeft[i].out;
        hashers[i].inputs[1] <== muxRight[i].out;

        hashes[i + 1] <== hashers[i].out;
    }

    root <== hashes[depth];
}

template EligibilityProof(treeDepth) {
    signal input studentSecret;
    signal input cgpaScaled;        
    signal input deptId;            
    signal input birthYear;         
    signal input feePaid;           
    signal input pathElements[treeDepth];
    signal input pathIndices[treeDepth];

    signal input merkleRoot;
    signal input scholarshipId;
    signal input minCgpaScaled;
    signal input requiredDeptId;    
    signal input requireFeePaid;    
    signal input maxBirthYear;      
    signal input recipient;        
    signal input nullifier;        

    component leafHasher = Poseidon(5);
    leafHasher.inputs[0] <== studentSecret;
    leafHasher.inputs[1] <== cgpaScaled;
    leafHasher.inputs[2] <== deptId;
    leafHasher.inputs[3] <== birthYear;
    leafHasher.inputs[4] <== feePaid;

    component merkleProof = PoseidonMerkleProof(treeDepth);
    merkleProof.leaf <== leafHasher.out;
    for (var i = 0; i < treeDepth; i++) {
        merkleProof.pathElements[i] <== pathElements[i];
        merkleProof.pathIndices[i] <== pathIndices[i];
    }

    merkleRoot === merkleProof.root;

    component cgpaBits = Num2Bits(12);
    cgpaBits.in <== cgpaScaled;

    component minCgpaBits = Num2Bits(12);
    minCgpaBits.in <== minCgpaScaled;

    component cgpaGte = GreaterEqThan(12);
    cgpaGte.in[0] <== cgpaScaled;
    cgpaGte.in[1] <== minCgpaScaled;
    cgpaGte.out === 1;   // enforce cgpaScaled >= minCgpaScaled

    component deptBits = Num2Bits(12);
    deptBits.in <== deptId;

    component reqDeptBits = Num2Bits(12);
    reqDeptBits.in <== requiredDeptId;

    component deptIsZero = IsZero();
    deptIsZero.in <== requiredDeptId;

    component deptMatch = IsEqual();
    deptMatch.in[0] <== deptId;
    deptMatch.in[1] <== requiredDeptId;

    requireFeePaid * (1 - requireFeePaid) === 0;  

    component feeNotRequired = IsZero();
    feeNotRequired.in <== requireFeePaid;

    component feeIsPaid = IsEqual();
    feeIsPaid.in[0] <== feePaid;
    feeIsPaid.in[1] <== 1;

    component birthBits = Num2Bits(12);
    birthBits.in <== birthYear;

    component maxBirthBits = Num2Bits(12);
    maxBirthBits.in <== maxBirthYear;

    component birthLte = LessEqThan(12);
    birthLte.in[0] <== birthYear;
    birthLte.in[1] <== maxBirthYear;
    birthLte.out === 1;   // enforce birthYear <= maxBirthYear

    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== studentSecret;
    nullifierHasher.inputs[1] <== scholarshipId;
    nullifier === nullifierHasher.out;

    signal recipientSquared;
    recipientSquared <== recipient * recipient;
}

component main {public [merkleRoot, scholarshipId, minCgpaScaled, requiredDeptId, requireFeePaid, maxBirthYear, recipient, nullifier]} = EligibilityProof(16);
