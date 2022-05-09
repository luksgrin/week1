const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const { groth16 } = require("snarkjs");
const { plonk } = require("snarkjs");

function unstringifyBigInts(o) {
    if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
        return BigInt(o);
    } else if ((typeof(o) == "string") && (/^0x[0-9a-fA-F]+$/.test(o) ))  {
        return BigInt(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts);
    } else if (typeof o == "object") {
        if (o===null) return null;
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = unstringifyBigInts(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

describe("HelloWorld", function () {
    let Verifier;
    let verifier;

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("HelloWorldVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Should return true for correct proof", async function () {
        //[assignment] Add comments to explain what each line is doing

        /* Create the proof and public signals variables by means of the following arguments:
            - The set of input signals
            - The proof .wasm
            - And the circuit final key
        */
        const { proof, publicSignals } = await groth16.fullProve({"a":"1","b":"2"}, "contracts/circuits/HelloWorld/HelloWorld_js/HelloWorld.wasm","contracts/circuits/HelloWorld/circuit_final.zkey");

        //Output the publicSignals, i.e. the result of computing the product of a and b
        console.log('1x2 =',publicSignals[0]);

        // Modify the JS editedPublicSignals variable so that they are of BigInt type
        const editedPublicSignals = unstringifyBigInts(publicSignals);
        // Modify the JS editedProof variable so that they are of BigInt type
        const editedProof = unstringifyBigInts(proof);
        // Create solidity call data from the previous variables
        const calldata = await groth16.exportSolidityCallData(editedProof, editedPublicSignals);

        // Use regex to convert values inside calldata to string
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());

        // Unpack values from the calldata
        const a = [argv[0], argv[1]];
        // Unpack values from the calldata
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        // Unpack values from the calldata
        const c = [argv[6], argv[7]];
        // Unpack values from the calldata
        const Input = argv.slice(8);

        // Make verification and check if it returns true
        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });
    /* Define a Jasmine test.
    The first arg. describes the test, the second is the function to be used on the test
    */
    it("Should return false for invalid proof", async function () {
        let a = [0, 0];
        let b = [[0, 0], [0, 0]];
        let c = [0, 0];
        let d = [0]
        expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
    });
});


describe("Multiplier3 with Groth16", function () {
    let Verifier;
    let verifier;

    beforeEach(async function () {
        //[assignment] insert your script here
        Verifier = await ethers.getContractFactory("Multiplier3Verifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Should return true for correct proof", async function () {
        //[assignment] insert your script here

        const { proof, publicSignals } = await groth16.fullProve(
            {"a":"3", "b":"2", "c": "5"},
            "contracts/circuits/Multiplier3/Multiplier3_js/Multiplier3.wasm",
            "contracts/circuits/Multiplier3/circuit_final.zkey"
            );

        console.log('3x2x5 =',publicSignals[0]);

        const editedPublicSignals = unstringifyBigInts(publicSignals);
        const editedProof = unstringifyBigInts(proof);
        const calldata = await groth16.exportSolidityCallData(editedProof, editedPublicSignals);

        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());

        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        const Input = argv.slice(8);

        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });
    it("Should return false for invalid proof", async function () {
        //[assignment] insert your script here
        let a = [0, 0];
        let b = [[0, 0], [0, 0]];
        let c = [0, 0];
        let d = [0]
        expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
    });
});


describe("Multiplier3 with PLONK", function () {
    let Verifier;
    let verifier;

    beforeEach(async function () {
        //[assignment] insert your script here
        Verifier = await ethers.getContractFactory("Multiplier3Verifier_plonk");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Should return true for correct proof", async function () {
        //[assignment] insert your script here
        const { proof, publicSignals } = await plonk.fullProve(
            {"a":"3", "b":"2", "c": "5"},
            "contracts/circuits/Multiplier3_plonk/Multiplier3_js/Multiplier3.wasm",
            "contracts/circuits/Multiplier3_plonk/circuit_final.zkey"
            );

        console.log('3x2x5 =',publicSignals[0]);

        const editedPublicSignals = unstringifyBigInts(publicSignals);
        const editedProof = unstringifyBigInts(proof);
        const calldata = await plonk.exportSolidityCallData(editedProof, editedPublicSignals);
        const splitcalldata = calldata.split(",");

        const argv = [
            splitcalldata[0],
            [BigInt(
                splitcalldata[1].replace(/["[\]\s]/g, "")
                ).toString()]
            ];

        expect(await verifier.verifyProof(argv[0], argv[1])).to.be.true;
    });
    it("Should return false for invalid proof", async function () {
        //[assignment] insert your script here

        // Make random inputs that won't ever work
        const randData = [...Array(1600)].map(
            () => Math.floor(Math.random() * 16).toString(16)
            ).join('');
        const argv = [
            "0x" + randData,
            [Math.floor(Math.random() * 50)]
            ];

        expect(await verifier.verifyProof(argv[0], argv[1])).to.be.false;
    });
});