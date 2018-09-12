import './walletConnector.js';

// var addLogWatching = function(newDocument){


//     var contractInstance = chain3.mc.contract(newDocument.jsonInterface).at(newDocument.address);
//     var blockToCheckBack = (newDocument.checkpointBlock || 0) - moacConfig.rollBackBy;
    
//     if(blockToCheckBack < 0)
//         blockToCheckBack = 0;

//     console.log('EVENT LOG:  Checking Custom Contract Events for '+ newDocument.address +' (_id: '+ newDocument._id + ') from block # '+ blockToCheckBack);

//     // delete the last logs until block -500
//     _.each(Events.find({_id: {$in: newDocument.contractEvents || []}, blockNumber: {$exists: true, $gt: blockToCheckBack}}).fetch(), function(log){
//         if(log)
//             Events.remove({_id: log._id});
//     });

//     var filter = contractInstance.allEvents({fromBlock: blockToCheckBack, toBlock: 'latest'});
    
//     // get past logs, to set the new blockNumber
//     var currentBlock = McBlocks.latest.number;
//     filter.get(function(error, logs) {
//         if(!error) {
//             // update last checkpoint block
//             CustomContracts.update({_id: newDocument._id}, {$set: {
//                 checkpointBlock: (currentBlock || McBlocks.latest.number) - moacConfig.rollBackBy
//             }});
//         }
//     });

//     filter.watch(function(error, log){
//         if(!error) {
//             var id = Helpers.makeId('log', chain3.sha3(log.logIndex + 'x' + log.transactionHash + 'x' + log.blockHash));

//             if(log.removed) {
//                 Events.remove(id);
//             } else {
//                 chain3.mc.getBlock(log.blockHash, function(err, block){
//                     if(!err) {

//                         _.each(log.args, function(value, key){
//                             // if bignumber
//                             if((_.isObject(value) || value instanceof BigNumber) && value.toFormat) {
//                                 value = value.toString(10);
//                                 log.args[key] = value;
//                             }
//                         });

//                         log.timestamp = block.timestamp;
//                         Events.upsert(id, log);
//                     }
//                 });
//             }
//         }
//     });
// };

/**
Observe custom contacts

@method observeMicroChainContracts
*/
observeMicroChainContracts = function(){

    /**
    Observe MicroChain contracts, listen for new created tokens.

    @class MicroChainContracts({}).observe
    @constructor
    */
    collectionObservers[collectionObservers.length] = MicroChainContracts.find({}).observe({
        /**
        Will check if the contracts are on the current chain

        @method added
        */
        added: function(newDocument) {
            // check if wallet has code
            chain3.mc.getCode(newDocument.address, function(e, code) {
                if(!e && code && code.length > 2 ){
                    MicroChainContracts.update(newDocument._id, {$unset: {
                        disabled: false
                    }});

                    // check for logs
                    // addLogWatching(newDocument);
                    
                } else if (!e) {
                    // if there's no code, check the contract has a balance
                    chain3.mc.getBalance(newDocument.address, function(e, balance) {
                        if(!e && balance.gt(0)){
                            MicroChainContracts.update(newDocument._id, {$unset: {
                                disabled: false
                            }});

                            // check for logs
                            // addLogWatching(newDocument);                        

                        } else if (!e) {
                            MicroChainContracts.update(newDocument._id, {$set: {
                                disabled: true
                            }});
                        } 
                    });                        
                }
            });
        }
    });
}