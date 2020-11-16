const {
    address,
} = require('./Utils/Ethereum');
// const expectThrow = require('./utils').expectThrow;
// const NULL_ADDRESS = require('./utils').NULL_ADDRESS;
[root, a3, ...accounts] = saddle.accounts;
let multiSig;
describe('MultiSigWallet', () => {
    const multiSigOwner = accounts[0];
    const additionalOwner = accounts[1];
    const anotherAccount = accounts[2];
    const sampleTx = {
        destination: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
        value: 0,
        data: '0x29ee8e450000000000000000000000007ba156fe5471185cb3eec2de9c058412c452bb4c000000000000000000000000cd2a3d9f938e13cd947ec05abc7fe734df8dd8260000000000000000000000000000000000000000000000000000002e90edd00000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000005654d41494e000000000000000000000000000000000000000000000000000000'
    };

    beforeEach(async () => {
        multiSig = await deploy('MultiSigWallet', [[multiSigOwner], 1]);
    });

    describe('initial state', () => {
        it('set the correct values', async () => {
            const owners = await call(multiSig, "getOwners");
            expect(owners.length).toEqualNumber(1);
            expect(owners[0]).toEqual(multiSigOwner);

            const required = await call(multiSig, "required");
            expect(required).toEqualNumber(1);
        });

        it('throws error with invalid parameters', async () => {
            await expect(deploy("MultiSigWallet", [[address(0)], 1], { from: multiSigOwner })).rejects.toRevert("revert Owners addresses are invalid");
            await expect(deploy("MultiSigWallet", [[multiSigOwner], 0], { from: multiSigOwner })).rejects.toRevert("revert Required value is invalid for the current owners count");
        });
    })

    describe('add owner', () => {
        it('adds a new owner successfully', async () => {
            let txData = multiSig.methods.addOwner(additionalOwner).encodeABI();

            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });

            let isOwner = await call(multiSig, "isOwner", [additionalOwner]);
            expect(isOwner).toEqual(true);

            const owners = await call(multiSig, "getOwners");
            expect(owners.length).toEqualNumber(2);
        });

        it('throws error with invalid parameters', async () => {
            await expect(send(multiSig, "addOwner", [multiSigOwner], { from: multiSigOwner })).rejects.toRevert("revert Only wallet allowed");
            let txData = multiSig.methods.addOwner(address(0)).encodeABI();
            let txId = 0;
            await send(multiSig, "submitTransaction", [multiSig._address, txId, txData], { from: multiSigOwner });
            let executionResult = await call(multiSig, "transactions", [txId]);
            expect(executionResult.executed).toEqual(false);
            txData = multiSig.methods.addOwner(multiSigOwner).encodeABI();
            await send(multiSig, "submitTransaction", [multiSig._address, txId, txData], { from: multiSigOwner });
            executionResult = await call(multiSig, "transactions", [txId]);
            expect(executionResult.executed).toEqual(false);
        });
    })

    describe('remove owner', () => {
        it('removes an owner successfully', async () => {
            let txData = multiSig.methods.addOwner(additionalOwner).encodeABI();
            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });

            let isOwner = await call(multiSig, "isOwner", [additionalOwner]);
            expect(isOwner).toEqual(true);
            txData = multiSig.methods.removeOwner(additionalOwner).encodeABI();

            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });

            isOwner = await call(multiSig, "isOwner", [additionalOwner]);
            expect(isOwner).toEqual(false);

            const owners = await call(multiSig, "getOwners");
            expect(owners.length).toEqualNumber(1);
        });

        it('removes current owner successfully', async () => {
            let txData = multiSig.methods.addOwner(additionalOwner).encodeABI();
            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });

            let isOwner = await call(multiSig, "isOwner", [additionalOwner]);
            expect(isOwner).toEqual(true);

            txData = multiSig.methods.removeOwner(multiSigOwner).encodeABI();
            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });

            isOwner = await call(multiSig, "isOwner", [multiSigOwner]);
            expect(isOwner).toEqual(false);

            const owners = await call(multiSig, "getOwners");
            expect(owners.length).toEqualNumber(1);
        });

        it('removes the owner and updates requirements', async () => {
            let txData = multiSig.methods.addOwner(additionalOwner).encodeABI();
            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });

            let isOwner = await call(multiSig, "isOwner", [additionalOwner]);
            expect(isOwner).toEqual(true);

            txData = multiSig.methods.changeRequirement(2).encodeABI();
            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });

            let required = await call(multiSig, "required");
            expect(required).toEqualNumber(2);
            txData = multiSig.methods.removeOwner(additionalOwner).encodeABI();
            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });
            await send(multiSig, "confirmTransaction", [2], { from: additionalOwner });

            isOwner = await call(multiSig, "isOwner", [additionalOwner]);
            expect(isOwner).toEqual(false);

            required = await call(multiSig, "required");
            expect(required).toEqualNumber(1);

        });

        it('throws error with invalid parameters', async () => {
            await expect(send(multiSig, "removeOwner", [multiSigOwner], { from: multiSigOwner })).rejects.toRevert("revert Only wallet allowed");
            await expect(send(multiSig, "removeOwner", [multiSigOwner], { from: multiSig._address })).rejects.toRevert("sender account not recognized");
            await expect(send(multiSig, "removeOwner", [address(0)], { from: multiSig._address })).rejects.toRevert("sender account not recognized");
            await expect(send(multiSig, "removeOwner", [anotherAccount], { from: multiSig._address })).rejects.toRevert("sender account not recognized");
        });
    })

    describe('replace owner', () => {
        it('replaces an owner successfully', async () => {
            let txData = multiSig.methods.addOwner(additionalOwner).encodeABI();
            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });

            txData = multiSig.methods.replaceOwner(additionalOwner, anotherAccount).encodeABI();
            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });

            let isOwner = await call(multiSig, "isOwner", [additionalOwner]);
            expect(isOwner).toEqual(false);

            isOwner = await call(multiSig, "isOwner", [anotherAccount]);
            expect(isOwner).toEqual(true);

            const owners = await call(multiSig, "getOwners");
            expect(owners.length).toEqualNumber(2);
        });

        it('throws error with invalid parameters', async () => {
            await expect(send(multiSig, "replaceOwner", [address(0), multiSigOwner], { from: multiSig._address })).rejects.toRevert("sender account not recognized");
            await expect(send(multiSig, "replaceOwner", [multiSigOwner, address(0)], { from: multiSig._address })).rejects.toRevert("sender account not recognized");
            await expect(send(multiSig, "replaceOwner", [additionalOwner, anotherAccount], { from: multiSig._address })).rejects.toRevert("sender account not recognized");
        });
    })

    describe('change requirement', () => {
        it('changes the required signers successfully', async () => {
            let txData = multiSig.methods.addOwner(additionalOwner).encodeABI();
            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });

            txData = multiSig.methods.changeRequirement(2).encodeABI();
            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });

            required = await call(multiSig, "required");
            expect(required).toEqualNumber(2);
        });

        it('throws error with invalid parameters', async () => {
            await expect(send(multiSig, "changeRequirement", [0], { from: multiSig._address })).rejects.toRevert("sender account not recognized");
            await expect(send(multiSig, "changeRequirement", [3], { from: multiSig._address })).rejects.toRevert("sender account not recognized");
        });
    })

    describe('submit transaction', () => {
        it('submits a new transaction successfully', async () => {
            await send(multiSig, "submitTransaction", [sampleTx.destination, sampleTx.value, sampleTx.data], { from: multiSigOwner });

            const transactionCount = await call(multiSig, "transactionCount");
            expect(transactionCount).toEqualNumber(1);

            const tx = await call(multiSig, "transactions", [0]);

            expect(tx.destination).toEqual(sampleTx.destination);
            expect(tx.value).toEqualNumber(sampleTx.value);
            expect(tx.data).toEqual(sampleTx.data);
            expect(tx.executed).toEqual(true);
        });

        it('throws error with invalid parameters', async () => {
            await expect(send(multiSig, "submitTransaction", [address(0), sampleTx.value, sampleTx.data], { from: multiSigOwner })).rejects.toRevert("revert Address cannot be empty");
        });
    })

    describe('confirm transaction', () => {
        it('confirms a transaction successfully', async () => {
            let txData = multiSig.methods.addOwner(additionalOwner).encodeABI();
            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });

            txData = multiSig.methods.changeRequirement(2).encodeABI();
            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });

            await send(multiSig, "submitTransaction", [sampleTx.destination, sampleTx.value, sampleTx.data], { from: multiSigOwner });
            let isConfirmed = await call(multiSig, "confirmations", [0, additionalOwner]);
            expect(isConfirmed).toEqual(false);

            await send(multiSig, "confirmTransaction", [2], { from: additionalOwner });

            isConfirmed = await call(multiSig, "confirmations", [2, additionalOwner]);
            expect(isConfirmed).toEqual(true);
        });

        it('throws error with invalid parameters', async () => {
            await expect(send(multiSig, "confirmTransaction", [0], { from: multiSigOwner })).rejects.toRevert("revert Transaction does not exist");

            let txData = multiSig.methods.addOwner(additionalOwner).encodeABI();
            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });
            await expect(send(multiSig, "confirmTransaction", [0], { from: multiSigOwner })).rejects.toRevert("revert Transaction is already confirmed by owner");

        });
    })

    describe('revoke confirmation', () => {
        it('revokes a confirmation successfully', async () => {
            let txData = multiSig.methods.addOwner(additionalOwner).encodeABI();
            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });

            txData = multiSig.methods.addOwner(anotherAccount).encodeABI();
            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });

            txData = multiSig.methods.changeRequirement(3).encodeABI();
            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });

            await send(multiSig, "submitTransaction", [sampleTx.destination, sampleTx.value, sampleTx.data], { from: multiSigOwner });
            await send(multiSig, "confirmTransaction", [3], { from: additionalOwner });

            let isConfirmed = await call(multiSig, "confirmations", [3, additionalOwner]);
            expect(isConfirmed).toEqual(true);

            await send(multiSig, "revokeConfirmation", [3], { from: additionalOwner });
            isConfirmed = await call(multiSig, "confirmations", [3, additionalOwner]);
            expect(isConfirmed).toEqual(false);
        });

        it('throws error with invalid parameters', async () => {
            await expect(send(multiSig, "revokeConfirmation", [0], { from: multiSigOwner })).rejects.toRevert("revert Transaction is not confirmed by owner");
            await expect(send(multiSig, "revokeConfirmation", [1], { from: multiSigOwner })).rejects.toRevert("revert Transaction is not confirmed by owner");
        });
    })

    describe('is confirmed', () => {
        it('checks if transaction is confirmed successfully', async () => {
            let txData = multiSig.methods.addOwner(additionalOwner).encodeABI();
            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });


            txData = multiSig.methods.changeRequirement(2).encodeABI();
            await send(multiSig, "submitTransaction", [multiSig._address, 0, txData], { from: multiSigOwner });

            await send(multiSig, "submitTransaction", [sampleTx.destination, sampleTx.value, sampleTx.data], { from: multiSigOwner });
            let isConfirmed = await call(multiSig, "isConfirmed", [2]);
            expect(isConfirmed).toEqual(false);

            await send(multiSig, "confirmTransaction", [2], { from: additionalOwner });

            isConfirmed = await call(multiSig, "isConfirmed", [2]);
            expect(isConfirmed).toEqual(true);
        });
    })

    describe('get confirmation count', () => {
        it('checks confirmation count successfully', async () => {
            await send(multiSig, "submitTransaction", [sampleTx.destination, sampleTx.value, sampleTx.data], { from: multiSigOwner });
            let count = await call(multiSig, "getConfirmationCount", [0]);
            expect(count).toEqualNumber(1);

        });
    })

    describe('get transaction count', () => {
        it('checks transaction count successfully', async () => {
            await send(multiSig, "submitTransaction", [sampleTx.destination, sampleTx.value, sampleTx.data], { from: multiSigOwner });
            let count = await call(multiSig, "getTransactionCount", [false, true]);
            expect(count).toEqualNumber(1);

            count = await call(multiSig, "getTransactionCount", [true, false]);
            expect(count).toEqualNumber(0);
        });
    })

    describe('get confirmations', () => {
        it('get transaction confirmations successfully', async () => {
            await send(multiSig, "submitTransaction", [sampleTx.destination, sampleTx.value, sampleTx.data], { from: multiSigOwner });
            let confirmations = await call(multiSig, "getConfirmations", [0]);
            expect(confirmations.length).toEqualNumber(1);
            expect(confirmations[0]).toEqual(multiSigOwner);

        });
    })

    describe('get transaction ids', () => {
        it('get transaction ids successfully', async () => {
            await send(multiSig, "submitTransaction", [sampleTx.destination, sampleTx.value, sampleTx.data], { from: multiSigOwner });
            let ids = await call(multiSig, "getTransactionIds", [0, 1, false, true]);
            expect(ids.length).toEqualNumber(1);
        });
    })

    describe('send value to multisig', () => {
        it('transfer a payment to the multisig address', async () => {
            const payment = 1000;
            await web3.eth.sendTransaction({ from: multiSigOwner, to: multiSig._address, value: payment })
            let multiSigBalance = await web3.eth.getBalance(multiSig._address);
            expect(payment).toEqualNumber(multiSigBalance);

        })

        it('send 0 ether to default method', async () => {
            await web3.eth.sendTransaction({ from: multiSigOwner, to: multiSig._address, value: 0 })
        })
    })

});

