// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract Groth16Verifier {
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    uint256 constant alphax  = 17264494644984080415676945549635870242269850571511079397218650400617783604574;
    uint256 constant alphay  = 8656050192540351954184196406918435393872902734453026045486470271629460135371;
    uint256 constant betax1  = 2192328100216882319727067442867441695634978855950480911528847079235413251619;
    uint256 constant betax2  = 12599522637897166078921089391718908919151476987711455531614144323771854791213;
    uint256 constant betay1  = 16701441678642058537706120093138391476479292712224639858308581136583767281870;
    uint256 constant betay2  = 19422540372300206261100711373569699063571194802561182995878864267432953077119;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 1729534128999040098384824908843688460621232051759230675917972960319478500396;
    uint256 constant deltax2 = 8663053881993776975611115289029027322493720412879239806045494565724405132111;
    uint256 constant deltay1 = 5017563334904273777131608178935161873277368207515771056015373494940523636832;
    uint256 constant deltay2 = 8306845234705135589350063788228266586021539285367015242548722108004633225877;

    uint256 constant IC0x = 18658852314096987617310348474081016500361916450542795480546720801279150959977;
    uint256 constant IC0y = 14715202079341808496057788542922496750875927275165455540835093124526495913454;

    uint256 constant IC1x = 20073643481638847774156417744140649317450654464471934456339704590914696738134;
    uint256 constant IC1y = 10066566881934252552350870545725595216284590400829689704647812580764759119636;

    uint256 constant IC2x = 4325852546890252035309146901193847173265480763235898091416031206449681862483;
    uint256 constant IC2y = 11779870214020688168970496376491811166907456637140564726966271503013179861133;

    uint256 constant IC3x = 4522116812336121496250025612231280255201992973811055288625804749216077797554;
    uint256 constant IC3y = 5446263538570997563441585209951015237154997743374679302355982009675837949680;

    uint256 constant IC4x = 8400754493544778500096537996908858829862795926194485321772242851897660246122;
    uint256 constant IC4y = 3713261407470522175825156465027443300231376259792568297880407534387596188048;

    uint256 constant IC5x = 9413212172951664686910631272724982184545898955357103450319176413256024328099;
    uint256 constant IC5y = 2577793479720387033760647789565851768158189365848332537577144576357445543873;

    uint256 constant IC6x = 12202217243458171345409075653677370730744333815040335902097087447723486479608;
    uint256 constant IC6y = 15428626189838092658015788793720893097803968541338504471130093496443278884521;

    uint256 constant IC7x = 11775642981142223012723090224744004863644716027516271007034824568484413455827;
    uint256 constant IC7y = 8876277287213613536806139724931232443826497231711282432341560014163489677301;

    uint256 constant IC8x = 4312671860017051847223440185150191344441706680107050982249521525739704854068;
    uint256 constant IC8y = 14299717968833515904741536547281131075813655551810743733776562059725226999261;

    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;
    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[8] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))

                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))

                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)

                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            checkField(calldataload(add(_pubSignals, 0)))
            checkField(calldataload(add(_pubSignals, 32)))
            checkField(calldataload(add(_pubSignals, 64)))
            checkField(calldataload(add(_pubSignals, 96)))
            checkField(calldataload(add(_pubSignals, 128)))
            checkField(calldataload(add(_pubSignals, 160)))
            checkField(calldataload(add(_pubSignals, 192)))
            checkField(calldataload(add(_pubSignals, 224)))

            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
            return(0, 0x20)
        }
    }
}
