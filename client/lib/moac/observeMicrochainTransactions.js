import '../collections.js';
import './walletConnector.js';

/**
Add a pending transaction to the transaction list, after sending

@method addTransactionAfterSend
*/
// chain3.setScsProvider(new chain3.providers.HttpProvider('http://localhost:8548'));
// scs_list = chain3.scs.getMicroChainList();
var scs_block = Session.get('blockNumber');


addMicroChainTransactionAfterSend = function(txHash, amount, from, to, gasPrice, estimatedGas, data, isMicroChain, tokenId) {
    var jsonInterface = undefined,
        contractName = undefined,
        txId = Helpers.makeId('tx', txHash);

    if(_.isObject(data)) {
        contractName = data.contract.name.replace(/([A-Z])/g, ' $1');
        jsonInterface = data.contract.jsonInterface;
        data = data.data;
    }

    MicroChainTransactions.upsert(txId, {$set: {
        tokenId: tokenId,
        value: amount,
        from: from,
        to: to,
        timestamp: moment().unix(),
        transactionHash: txHash,
        data: data,
        jsonInterface: jsonInterface,
        contractName: contractName,
        isMicroChain: isMicroChain
    }});

    // add from Account
    McAccounts.update({address: from}, {$addToSet: {
        transactions: txId
    }});

    // add to Account
    McAccounts.update({address: to}, {$addToSet: {
        transactions: txId
    }});
};



/**
Add new in/outgoing transaction

@method addTransaction
@param {Object} log
@param {String} from
@param {String} to
@param {String} value
@return {Boolean} TRUE if a transaction already existed
*/
addMicroChainTransaction = function(log, from, to, value){
    var txId = Helpers.makeId('tx', log.transactionHash);

    // add the tx already here
    MicroChainTransactions.upsert(txId, {
        to: to,
        from: from,
        value: value
    });

    var block = chain3.mc.getBlock(log.blockNumber, false, function(err, block){
        if(!err) {

            chain3.mc.getTransaction(log.transactionHash, function(err, transaction) {
                if(!err && transaction) {
                    chain3.mc.getTransactionReceipt(log.transactionHash, function(err, receipt){

                        delete transaction.hash;
                        transaction.transactionHash = log.transactionHash;

                        var tx = {
                            _id: txId,
                            timestamp: block.timestamp,
                        };

                        if(log.tokenId)
                            tx.tokenId = log.tokenId;

                        if(log.args.operation)
                            tx.operation = log.args.operation;

                        if(!err) {
                            updateTransaction(tx, transaction, receipt);

                        }
                    });
                }
            });
        }
    });

    return MicroChainTransactions.findOne(txId);
};

/**
Updates a transaction.

@method updateTransaction
@param {Object} newDocument     The transaction object from our database
@param {Object} transaction     The transaction object from getTransaction
@param {Object} receipt     The transaction object from getTransactionReceipt
@return {Object} The updated transaction
*/
var updateMicroChainTransaction = function(newDocument, transaction, receipt, blockHash){
console.log('add blocknumber, update micorchainInfo')
console.log(newDocument);
    var id = newDocument._id || Helpers.makeId('tx', transaction.transactionHash || newDocument.transactionHash);

    // if transaction has no transactionId, stop
    if(!id)
        return;

    var oldTx = MicroChainTransactions.findOne({_id: id});

    // if no tx was found, means it was never created, or removed, through log.removed: true
    if(!oldTx)
        return;

    newDocument._id = id;

    if(transaction) {
        newDocument.blockNumber = blockHash.number;
        newDocument.blockHash = blockHash.hash;
        newDocument.transactionIndex = transaction.transactionIndex;
        if(transaction.transactionHash)
            newDocument.transactionHash = transaction.transactionHash;

        // newDocument.data = transaction.input || transaction.data || null;
        if(_.isString(newDocument.data) && newDocument.data === '0x')
            newDocument.data = null;
        //retrieve gasPrice
        // newDocument.gasPrice = transaction.gasPrice.toString(10);
    }

    if(receipt && transaction) {

        // check for code on the address
        if(!newDocument.contractAddress && newDocument.to) {
            chain3.mc.getCode(newDocument.to, function(e, code) {
                if(!e && code.length > 2) {
                    MicroChainTransactions.update({_id: id}, {$set: {
                        deployedData: code
                    }});

                    // Add contract to the contract list
                    if(oldTx && oldTx.jsonInterface) {
                        CustomContracts.upsert({address: newDocument.to}, {$set: {
                            address: newDocument.to,
                            name: ( oldTx.contractName || 'New Contract') + ' ' + newDocument.to.substr(2, 4),
                            jsonInterface: oldTx.jsonInterface
                        }});}
                    }});
        }}

                        

    //                     //If it looks like a token, add it to the list
    //                     var functionNames = _.pluck(oldTx.jsonInterface, 'name');
    //                     var isToken = _.contains(functionNames, 'transfer') && _.contains(functionNames, 'Transfer') && _.contains(functionNames, 'balanceOf');
    //                     console.log("isToken: ",isToken)

    //                     if(isToken) {

    //                         tokenId = Helpers.makeId('token', receipt.contractAddress);

    //                         Tokens.upsert(tokenId, {$set: {
    //                             address: receipt.contractAddress,
    //                             name: oldTx.name + ' ' + receipt.contractAddress.substr(2, 4),
    //                             symbol: oldTx.name + receipt.contractAddress.substr(2, 4),
    //                             balances: {},
    //                             decimals: 0
    //                         }});


    //                         // check if the token has information about itself asynchrounously
    //                         var tokenInstance = TokenContract.at(receipt.contractAddress);

    //                         tokenInstance.name(function(e, i){
    //                             Tokens.upsert(tokenId, {$set: {
    //                                 name: i
    //                             }});
    //                             CustomContracts.upsert({address: receipt.contractAddress}, {$set: {
    //                                 name: TAPi18n.__('wallet.tokens.admin', { name: i } )
    //                             }});
    //                         });

    //                         tokenInstance.decimals(function(e, i){
    //                             Tokens.upsert(tokenId, {$set: {
    //                                 decimals: Number(i)
    //                             }});
    //                         });
    //                         tokenInstance.symbol(function(e, i){
    //                             Tokens.upsert(tokenId, {$set: {
    //                                 symbol: i
    //                             }});
    //                         });

    //                     }
    //                 }
    //             }
    //         })
    //     }

    //     newDocument.contractAddress = receipt.contractAddress;
    //     newDocument.gasUsed = receipt.gasUsed;
    //     newDocument.gasLimit = transaction.gas;
    //     newDocument.outOfGas = receipt.gasUsed === transaction.gas;
    //     newDocument.fee = transaction.gasPrice.times(new BigNumber(receipt.gasUsed)).toString(10);
    // }

    if(oldTx) {

        // prevent wallet events overwriding token transfer events
        if(oldTx.tokenId && !newDocument.tokenId) {
            console.log('oldDOC != newDOC')
            newDocument.tokenId = oldTx.tokenId;
            newDocument.from = oldTx.from;
            newDocument.to = oldTx.to;
            newDocument.value = oldTx.value;
        }

        delete newDocument._id;

        MicroChainTransactions.update({_id: id}, {$set: newDocument});
    }

    // check previous balance, vs current balance, if different remove the out of gas
    if(newDocument.outOfGas) {
        console.log('point1 remove');
        var warningText = TAPi18n.__('wallet.transactions.error.outOfGas', {from: Helpers.getAccountNameByAddress(newDocument.from), to: Helpers.getAccountNameByAddress(newDocument.to)});

        if(McAccounts.findOne({address: newDocument.from})) {
            chain3.mc.getBalance(newDocument.from, newDocument.blockNumber, function(e, now){
                if(!e) {
                    chain3.mc.getBalance(newDocument.from, newDocument.blockNumber-1, function(e, then){
                        if(!e && now.toString(10) !== then.toString(10)) {
                            console.log(newDocument.transactionHash, 'Removed out of gas, as balance changed');
                            MicroChainTransactions.update({_id: id}, {$set: {outOfGas: false}});
                        } else {
                            GlobalNotification.warning({
                               content: warningText,
                               duration: 10
                            });
                        }
                    });
                }
            });
        } else {
            GlobalNotification.warning({
               content: warningText,
               duration: 10
            });
        }
    }
};


/**
Observe transactions and pending confirmations

@method observeTransactions
*/
observeMicroChainTransactions = function(){

    /**
    Checking for confirmations of transactions.

    @method checkTransactionConfirmations
    @param {Object} newDocument
    @param {Object} oldDocument
    */

    var checkMicroChainTransactionConfirmations = function(tx){
        var confCount = 0;
        // check for confirmations
        if(!tx.confirmed && tx.transactionHash) {

            var updateTransactions = function(e, blockHash){
                console.log('updateTransactions', e, blockHash);
                
                // console.log('scs_block ' + scs_block);


                if(!e) {
                    console.log('tx_blocknumber ' + tx.blockNumber);
                    var confirmations = (tx.blockNumber && blockHash.number) ? (blockHash.number + 1) - tx.blockNumber : 0;
                    confCount++;
                    // console.log('confirmation ' + confirmations);
                    console.log("current count: " + confCount)
                    // get the latest tx data
                    console.log('before find',tx);
                    tx = MicroChainTransactions.findOne(tx._id);
                    console.log('after find',tx);
                    // stop if tx was removed
                    if(!tx) {
                        // filter.stopWatching();
                        console.log('no tx stop')
                        clearInterval(filter);
                        return;
                    }


                    if(confirmations < moacConfig.requiredConfirmations && confirmations >= 0) {
                        Helpers.eventLogs('Checking transaction '+ tx.transactionHash +'. Current confirmations: '+ confirmations);
                        // Check if the tx still exists, if not disable the tx
                        chain3.scs.getTransactionByHash(tx.to, tx.transactionHash, function(e, transaction){
                            chain3.scs.getReceiptByHash(tx.to, tx.transactionHash, function(e, receipt){
                                // console.log('transaction',transaction);
                                //   console.log('receipt',receipt);
                                if(e || !receipt || !transaction) {
                                    console.log('no receipt or transaction')
                                    return;
                                    }
                                // update with receipt
                                console.log('tx',tx);
                                if( !tx.blockNumber){//transaction.status == '0x1' &&
                                    // console.log('transactionBLK',transaction.blockNumber);
                                    updateMicroChainTransaction(tx, transaction, receipt, blockHash);
                                }

                                // enable transaction, if it was disabled
                                else if(tx.blockNumber && tx.disabled)
                                    MicroChainTransactions.update(tx._id, {$unset:{
                                        disabled: ''
                                    }});

                                // disable transaction if gone (wait for it to come back)
                                else if(!tx.blockNumber) {
                                    MicroChainTransactions.update(tx._id, {$set:{
                                        disabled: true
                                    }});
                                }
                            });
                        });

                    }

                    if(confirmations > moacConfig.requiredConfirmations || confCount > moacConfig.requiredConfirmations*2) {

                        // confirm after a last check
                        chain3.scs.getTransactionByHash(tx.to, tx.transactionHash, function(e, transaction){
                            chain3.scs.getReceiptByHash(tx.to, tx.transactionHash, function(e, receipt){
                                if(!e) {
                                   
                                    // if still not mined, remove tx
                                    if(!transaction || !tx.blockNumber) {
                                        console.log('point2 remove');
                                        var warningText = TAPi18n.__('wallet.transactions.error.outOfGas', {from: Helpers.getAccountNameByAddress(tx.from), to: Helpers.getAccountNameByAddress(tx.to)});
                                        Helpers.eventLogs(warningText);
                                        GlobalNotification.warning({
                                            content: warningText,
                                            duration: 10
                                        });

                                        MicroChainTransactions.remove(tx._id);
                                        // filter.stopWatching();
                                         clearInterval(filter);

                                    } else if(tx.blockNumber) {


                                        // check if parent block changed
                                        // TODO remove if later tx.blockNumber can be null again
                                        chain3.scs.getBlock(tx.to, tx.blockNumber, function(e, block) {
                                            if(!e) {
                                                // console.log('blockhash',block.hash);
                                                //  console.log('txblockhash',tx.blockHash);
                                                if(block.hash === tx.blockHash) {
                                                    tx.confirmed = true;
                                                    MicroChainTransactions.update({_id: tx._id}, {$set: tx});
                                                    // updateMicroChainTransaction(tx, transaction, receipt);

                                                    // remove disabled
                                                    if(tx.disabled)
                                                        MicroChainTransactions.update(tx._id, {$unset:{
                                                            disabled: ''
                                                        }});

                                                // remove if the parent block is not in the chain anymore.
                                                } else {
                                                    MicroChainTransactions.remove(tx._id);
                                                }

                                                clearInterval(filter);
                                            }
                                        });

                                    }
                                }
                            });
                        });
                    }
                }
            };

            // var filter = chain3.mc.filter('latest').watch(function(e, blockHash) {
            //     updateTransactions(e, blockHash);
            // });
            var filter = setInterval(function(){
                var scs_block = Session.get('blockNumber');
                chain3.scs.getBlock(tx.to, scs_block, function(e,blockHash){
                    console.log("get block hash",e,blockHash);
                     updateTransactions(e, blockHash);
                })
            },10000);
        }
    };

    /**
    Observe transactions, listen for new created transactions.

    @class Transactions({}).observe
    @constructor
    */
    collectionObservers[collectionObservers.length] = MicroChainTransactions.find({}).observe({
        /**
        This will observe the transactions creation and create watchers for outgoing transactions, to see when they are mined.

        @method added
        */
        added: function(newDocument) {
            
            var scs_block = Session.get('blockNumber');
            var confirmations = scs_block - newDocument.blockNumber;
            console.log('new doc: ', newDocument);
            console.log('microchain added');

            // add to accounts
            Wallets.update({address: newDocument.from}, {$addToSet: {
                transactions: newDocument._id
            }});
            Wallets.update({address: newDocument.to}, {$addToSet: {
                transactions: newDocument._id
            }});

            // remove pending confirmations, if present
            if(newDocument.operation) {
                checkConfirmation(Helpers.makeId('pc', newDocument.operation));
            }


            // check first if the transaction was already mined
            if(!newDocument.confirmed) {
                checkMicroChainTransactionConfirmations(newDocument);
            }

            // If on main net, add price data
            if( Session.get('network') == 'main' && 
                newDocument.timestamp &&
               (!newDocument.exchangeRates ||
               !newDocument.exchangeRates.btc ||
               !newDocument.exchangeRates.usd ||
               !newDocument.exchangeRates.eur ||
               !newDocument.exchangeRates.gbp ||
               !newDocument.exchangeRates.brl)) {
                var url = 'https://min-api.cryptocompare.com/data/pricehistorical?fsym=MC&tsyms=BTC,USD,EUR,GBP,BRL&ts='+ newDocument.timestamp;

                if(typeof mist !== 'undefined')
                    url += '&extraParams=Mist-'+ mist.version;

                HTTP.get(url, function(e, res){

                    if(!e && res && res.statusCode === 200) {
                        var content = JSON.parse(res.content);

                        if(content && content.Response !== "Error"){
                            _.each(content, function(price, key){
                                if(price && _.isFinite(price)) {
                                    var name = key.toLowerCase();
                                    var set = {};
                                    set['exchangeRates.'+ name] = {
                                        price: String(price),
                                        timestamp: null
                                    };

                                    Transactions.update(newDocument._id, {$set: set});
                                }
                            });
                        }
                    } else {
                        console.warn('Can not connect to https://min-api.cryptocompare.com/ to get price ticker data, please check your internet connection.');
                    }
                });
            }
        },
        /**
        Will check if the transaction is confirmed

        @method changed
        */
        changed: function(newDocument){
              console.log('microchain changed');
            // add to accounts
            Wallets.update({address: newDocument.from}, {$addToSet: {
                transactions: newDocument._id
            }});
            Wallets.update({address: newDocument.to}, {$addToSet: {
                transactions: newDocument._id
            }});

            // remove pending confirmations, if present
            if(newDocument.operation) {
                checkConfirmation(Helpers.makeId('pc', newDocument.operation));
            }
        },
        /**
        Remove transactions confirmations from the accounts

        @method removed
        */
        removed: function(document) {
              console.log('microchain removed');
            Wallets.update({address: document.from}, {$pull: {
                transactions: document._id
            }});
            Wallets.update({address: document.to}, {$pull: {
                transactions: document._id
            }});
            McAccounts.update({address: document.from}, {$pull: {
                transactions: document._id
            }});
            McAccounts.update({address: document.to}, {$pull: {
                transactions: document._id
            }});
        }
    });

};
