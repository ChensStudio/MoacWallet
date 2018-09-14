import {Template} from 'meteor/templating';
import './accountLink.js';
import '../../lib/helpers/helperFunctions.js';
import '../../lib/helpers/scsapi.js';
import './executeContract.html';

function checkMicroChainContract(){
    var isMicroChainContract = FlowRouter.getParam('isMicroChainContract');
    return (isMicroChainContract == 'true');
};

function getCurrentNonce(contractAddress, template){
    var monitorAddr = TemplateVar.get('monitorAddr');
    var monitorPort = TemplateVar.get('monitorPort');
    var nonce = -1;

    if (monitorAddr !== "" && monitorAddr !== undefined && monitorPort !== "" && monitorPort !== undefined){
        var sender = Helpers.getAccountByAddress(TemplateVar.getFrom('.execute-contract select[name="dapp-select-account"]', 'value'));
        
        scsApi.getNonce(monitorAddr, monitorPort, sender.address, contractAddress, (error, result) => {
            if(!error){
                nonce = JSON.parse(result.content).result;
                if (typeof nonce === 'undefined'){
                    nonce = -1;
                }
            }
            
            TemplateVar.set(template, 'nonce', nonce);
        });
    }
};

/**
Template Controllers

@module Templates
*/

/**
The execute contract template

@class [template] elements_executeContract
@constructor
*/

Template['elements_executeContract'].onCreated(function(){
    var template = this;

    // Set Defaults
    TemplateVar.set('sending', false);

    // show execute part if its a custom contract
    if(CustomContracts.findOne({address: template.data.address})||MicroChainContracts.findOne({address: template.data.address}))
        TemplateVar.set('executionVisible', true);

    // check address for code
    chain3.mc.getCode(template.data.address, function(e, code) {
        if(!e && code.length > 2) {
            TemplateVar.set(template, 'hasCode', true);
        }
    });
});


Template['elements_executeContract'].helpers({
    /**
    Reruns when the data context changes

    @method (reactiveContext)
    */
    'reactiveContext': function() {
        if(checkMicroChainContract()){
            var contract = MicroChainContracts.findOne({address: this.address}, {});
            this.jsonInterface = contract.jsonInterface;
        }

        var contractInstance = chain3.mc.contract(this.jsonInterface).at(this.address);

        var contractFunctions = [];
        var contractConstants = [];

        _.each(this.jsonInterface, function(func, i){
            func = _.clone(func);

            // Walk throught the jsonInterface and extract functions and constants
            if(func.type == 'function') {
                func.contractInstance = contractInstance;
                func.inputs = _.map(func.inputs, Helpers.createTemplateDataFromInput);

                if(func.constant){
                    // if it's a constant                        
                    contractConstants.push(func);                    
                } else {
                    //if its a variable
                    contractFunctions.push(func);                
                }
                
            }
        });

        TemplateVar.set('contractConstants', contractConstants);
        TemplateVar.set('contractFunctions', contractFunctions);
    },
    /**
    Get the isMicroChainContract for select contract

    @method (isMicroChainContract)
    */
   'isMicroChainContract': function(){
        return checkMicroChainContract();
}
});

Template['elements_executeContract'].events({
    /**
    Select a contract function
    
    @event 'change .select-contract-function
    */
    'change .select-contract-function': function(e, template){
        TemplateVar.set('executeData', null);


        // change the inputs and data field
        TemplateVar.set('selectedFunction', _.find(TemplateVar.get('contractFunctions'), function(contract){
            return contract.name === e.currentTarget.value;
        }));

        Tracker.afterFlush(function(){
            $('.abi-input').trigger('change');
        });
    },
    /**
    Click the show hide button

    @event click .toggle-visibility
    */
    'click .toggle-visibility': function(){
        TemplateVar.set('executionVisible', !TemplateVar.get('executionVisible'));
    }
});



/**
The contract constants template

@class [template] elements_executeContract_constant
@constructor
*/

/**
Formats the values for display

@method formatOutput
*/
var formatOutput = function(val) {
    if(_.isArray(val))
        return _.map(val, formatOutput);
    else {

        // stringify boolean
        if(_.isBoolean(val))
            val = val ? 'YES' : 'NO';

        // convert bignumber objects
        val = (_.isObject(val) && val.toString)
            ? val.toString(10)
            : val;

        return val;
    }
};

Template['elements_executeContract_constant'].onCreated(function(){
    var template = this;

    // initialize our input data prior to the first call
    TemplateVar.set('inputs', _.map(template.data.inputs, function(input) {
        return Helpers.addInputValue([input], input, {})[0];
    }));

    // call the contract functions when data changes and on new blocks
    this.autorun(function() {
        // make reactive to the latest block
        McBlocks.latest;

        // get args for the constant function and add callback
        var args = TemplateVar.get('inputs').concat(function(e, r) {
            if(!e) {
                var outputs = [];
                // single return value
                if(template.data.outputs.length === 1) {
                    template.data.outputs[0].value = r;
                    outputs.push(template.data.outputs[0]);

                // multiple return values
                } else {
                    outputs = _.map(template.data.outputs, function(output, i) {
                        output.value = r[i];
                        return output;
                    });
                }

                TemplateVar.set(template, 'outputs', outputs);
            } 
        });

        template.data.contractInstance[template.data.name].apply(null, args);

    });
});

Template['elements_executeContract_constant'].helpers({
    /**
    Formats the value if its a big number or array

    @method (value)
    */
    'value': function() {
        return _.isArray(this.value) ? formatOutput(this.value) : [formatOutput(this.value)];
    },
    /**
    Figures out extra data

    @method (extra)
    */
    'extra': function() {
        var data = formatOutput(this); // 1000000000

        if (data > 1400000000 && data < 1800000000 && Math.floor(data/1000) != data/1000) {
            return '(' + moment(data*1000).fromNow() + ')';
        }

        if (data == 'YES') {
            return '<span class="icon icon-check"></span>';
        } else if (data == 'NO') {
            return '<span class="icon icon-ban"></span>'
        }
        return;
    }
});

Template['elements_executeContract_constant'].events({
    /**
    React on user input on the constant functions

    @event change .abi-input, input .abi-input
    */
    'change .abi-input, input .abi-input, blur .abi-input': function(e, template) {
        var inputs = Helpers.addInputValue(template.data.inputs, this, e.currentTarget);
        TemplateVar.set('inputs', inputs);
    }
});

/**
The contract function template

@class [template] elements_executeContract_function
@constructor
*/


Template['elements_executeContract_function'].onCreated(function(){
    var template = this;
    TemplateVar.set('estimatedGas', 350000);
    // change the amount when the currency unit is changed
    template.autorun(function(c){
        var unit = McTools.getUnit();

        if(!c.firstRun) {
            TemplateVar.set('amount', McTools.toSha(template.find('input[name="amount"]').value.replace(',','.'), unit));
        }
    });
});

Template['elements_executeContract_function'].onRendered(function(){
    // Run all inputs through formatter to catch bools
    this.$('.abi-input').trigger('change');
});

Template['elements_executeContract_function'].helpers({
    'reactiveDataContext': function(){
        if(this.inputs.length === 0)
            TemplateVar.set('executeData', this.contractInstance[this.name].getData());
    }, 
    'payable': function(){
        return this && this.payable;
    },
   'estimatedGas': function(){
        var estimatedGas = TemplateVar.get('estimatedGas');
        return estimatedGas;
    },
    /**
    Get the isMicroChainContract for select contract

    @method (isMicroChainContract)
    */
   'isMicroChainContract': function(){
        return checkMicroChainContract();
    },
    'monitorAddr': function(){
        var monitorAddr = TemplateVar.get('monitorAddr');
        if (typeof monitorAddr === 'undefined'){
            monitorAddr = '127.0.0.1';
            TemplateVar.set('monitorAddr', monitorAddr);
        }
        
        getCurrentNonce(this.contractInstance.address, Template.instance());
        return monitorAddr;
    },
    'monitorPort': function(template){
        var monitorPort = TemplateVar.get('monitorPort');
        if (typeof monitorPort === 'undefined'){
            monitorPort = '50068';
            TemplateVar.set('monitorPort', monitorPort);
        }

        getCurrentNonce(this.contractInstance.address, Template.instance());
        return monitorPort;
    },
    'nonce': function(){
          var nonce = TemplateVar.get('nonce');
          return nonce;
    }
});

Template['elements_executeContract_function'].events({
    /**
    Set the amount while typing
    
    @event keyup input[name="amount"], change input[name="amount"], input input[name="amount"]
    */
    'keyup input[name="amount"], change input[name="amount"], input input[name="amount"]': function(e, template){
        var sha = McTools.toSha(e.currentTarget.value.replace(',','.'));
        TemplateVar.set('amount', sha || '0');
    },
    /**
    React on user input on the execute functions

    @event change .abi-input, input .abi-input
    */
    'change .abi-input, input .abi-input, blur .abi-input': function(e, template) {
        var inputs = Helpers.addInputValue(template.data.inputs, this, e.currentTarget);
    
        TemplateVar.set('executeData', template.data.contractInstance[template.data.name].getData.apply(null, inputs));
    },
    /**
        React on user input on gas

        @event change .estimtedGasInput
        */
    'change .estimtedGasInput': function(e, template) {
        TemplateVar.set('estimatedGas', e.currentTarget.valueAsNumber);
    },
    /**
        React on user input on nonce

        @event change .nonceInput
        */
    //    'change .nonceInput': function(e, template) {
    //     TemplateVar.set('nonce', e.currentTarget.valueAsNumber);
    // },
    /**
    React on user input on Monitor RPC Address

    @event change .monitorAddrInput
    */
   'keyup .monitorAddrInput, change .monitorAddrInput, input .monitorAddrInput': function(e, template) {
        TemplateVar.set('monitorAddr', e.currentTarget.value);
        getCurrentNonce(this.contractInstance.address, template);
    },
    /**
    React on user input on Monitor RPC Port

    @event change .monitorAddrInput
    */
    'keyup .monitorPortInput, change .monitorPortInput, input .monitorPortInput': function(e, template) {
        TemplateVar.set('monitorPort', e.currentTarget.value);
        getCurrentNonce(this.contractInstance.address,template);
    },
    /**
    Executes a transaction on contract

    @event click .execute
    */
    'click .execute': function(e, template){
        var to = template.data.contractInstance.address,
            gasPrice = 50000000000,
            estimatedGas = TemplateVar.get('estimatedGas'), /* (typeof mist == 'undefined')not working */
            amount = TemplateVar.get('amount') || 0,
            selectedAccount = Helpers.getAccountByAddress(TemplateVar.getFrom('.execute-contract select[name="dapp-select-account"]', 'value')),
            data = TemplateVar.get('executeData');

        var latestTransaction =  Transactions.findOne({}, {sort: {timestamp: -1}});
        if (latestTransaction && latestTransaction.gasPrice)
            gasPrice = latestTransaction.gasPrice; 

        if(selectedAccount) {

            console.log('Providing gas: ', estimatedGas ,' + 50000');

            if(selectedAccount.balance === '0')
                return GlobalNotification.warning({
                    content: 'i18n:wallet.send.error.emptyWallet',
                    duration: 2
                });


            // The function to send the transaction
            var sendTransaction = function(estimatedGas){

                TemplateVar.set('sending', true);

                // CONTRACT TX
                if(contracts['ct_'+ selectedAccount._id]) {

                    // Load the accounts owned by user and sort by balance
                    var accounts = McAccounts.find({name: {$exists: true}}, {sort: {name: 1}}).fetch();
                    accounts.sort(Helpers.sortByBalance);

                    // Looks for them among the wallet account owner
                    var fromAccount = _.find(accounts, function(acc){
                       return (selectedAccount.owners.indexOf(acc.address)>=0);
                    })

                    contracts['ct_'+ selectedAccount._id].execute.sendTransaction(to || '', amount || '', data || '', {
                        from: fromAccount.address,
                        gasPrice: gasPrice,
                        gas: estimatedGas
                    }, function(error, txHash){

                        TemplateVar.set(template, 'sending', false);

                        console.log(error, txHash);
                        if(!error) {
                            console.log('SEND from contract', amount);

                            addTransactionAfterSend(txHash, amount, selectedAccount.address, to, gasPrice, estimatedGas, data);

                            FlowRouter.go('dashboard');

                        } else {
                            // McElements.Modal.hide();

                            GlobalNotification.error({
                                content: error.message,
                                duration: 8
                            });
                        }
                    });
                
                // SIMPLE TX
                } else {
                    var tranData;
                    if(checkMicroChainContract()){
                        var nonce = TemplateVar.get('nonce');
                        if(typeof nonce === 'undefined' || nonce === -1){
                            TemplateVar.set(template, 'sending', false);

                            GlobalNotification.error({
                                content: "i18n:wallet.send.error.nonceError",
                                duration: 4
                            });

                            return;
                        }
                        tranData={
                            from: selectedAccount.address,
                            to: to,
                            data: data,
                            value: amount,
                            gasPrice: gasPrice,
                            gas: estimatedGas,
                            shardingFlag: 1,
                            nonce: nonce,
                            via: selectedAccount.address
                        };

                        isMicroChain = true;
                    }
                    else{
                        tranData={
                            from: selectedAccount.address,
                            to: to,
                            data: data,
                            value: amount,
                            gasPrice: gasPrice,
                            gas: estimatedGas
                        };
                    }

                    chain3.mc.sendTransaction(tranData, function(error, txHash){

                        TemplateVar.set(template, 'sending', false);

                        if(!error) {
                            addTransactionAfterSend(txHash, amount, selectedAccount.address, to, gasPrice, estimatedGas, data);

                            // FlowRouter.go('dashboard');
                            GlobalNotification.success({
                               content: 'i18n:wallet.send.transactionSent',
                               duration: 2
                            });
                        } else {

                            // McElements.Modal.hide();

                            GlobalNotification.error({
                                content: error.message,
                                duration: 8
                            });
                        }
                    });
                }   
            };

            sendTransaction(estimatedGas);    
        }
    }
});

