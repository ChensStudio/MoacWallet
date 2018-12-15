import {Template} from 'meteor/templating';
import '../../../lib/helpers/helperFunctions.js';
import '../../../lib/helpers/templateHelpers.js';
import '../../elements/accountLink.js';
import '../../elements/createdContractAt.js';
import './transactionInfo.html';

/**
Template Controllers

@module Templates
*/


/**
The transaction info template

@class [template] views_modals_transactionInfo
@constructor
*/



Template['views_modals_transactionInfo'].helpers({
    /**
    Returns the current transaction

    @method (transaction)
    @return {Object} the current transaction
    */
    'transaction': function() {
        //console.log(Transactions.findOne(this._id)?Transactions.findOne(this._id):MicroChainTransactions.findOne(this._id));
        return Transactions.findOne(this._id)?Transactions.findOne(this._id):MicroChainTransactions.findOne(this._id);
    },
    /**
    Calculates the confirmations of this tx

    @method (confirmations)
    @return {Number} the number of confirmations
    */
    'confirmations': function(){
        // console.log(this);
        var scs_block = Session.get('blockNumber');
        if(this.isMicroChain) {
            return (scs_block && this.blockNumber)
            ? scs_block + 1 - this.blockNumber : 0;
        }
        return (McBlocks.latest && this.blockNumber)
            ? McBlocks.latest.number + 1 - this.blockNumber : 0;
    },
    /**
    Token value

    @method (tokenValue)
    */
    'tokenValue': function() {
        var token = Tokens.findOne(this.tokenId);

        return (token) ? Helpers.formatNumberByDecimals(this.value, token.decimals) +' '+ token.symbol : this.value;
    },
    /**
    Gas Price per million

    @method (gasPricePerMillion)
    */
    'gasPricePerMillion': function() {
        return this.gasPrice * 1000000;
    },
    /**
    If microchain

    @method (ismicrochain)
    */
    'ismicrochain':function(){
        if (CustomContracts.findOne({address:this.to})){
            return 'false';
        }
        return 'true';
    },
    /**
    If get transactionInfo from motherchain table

    @method (FromMother)
    */
    'MoherChainTX':function(){
        return Transactions.findOne(this._id)?"true":"false";
    }
    
});

