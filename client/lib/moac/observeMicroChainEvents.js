// meant to speed up and make less requests
var microChainContractsCache = {};
/**
Observe events

@method observeMicroChainEvents
*/
observeMicroChainEvents = function(){
    /**
    Observe transactions, listen for new created transactions.

    @class Events({}).observe
    @constructor
    */
    collectionObservers[collectionObservers.length] = MicroChainEvents.find({}).observe({
        /**
        This will observe when events are added and link it to the microchain contract.

        @method added
        */
        added: function(newDocument) {
            MicroChainContracts.update({address: newDocument.address.toLowerCase()}, {$addToSet: {
                contractEvents: newDocument._id
            }});

        },
        /**
        Remove events confirmations from the accounts

        @method removed
        */
        removed: function(document) {
            MicroChainContracts.update({address: document.address.toLowerCase()}, {$pull: {
                contractEvents: document._id
            }});
        }
    });

};