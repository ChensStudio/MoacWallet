import {Template} from 'meteor/templating';
import '../../lib/thirdparty/ace.js';
import '../../lib/thirdparty/mode-java.js';
import '../../lib/thirdparty/mode-typescript.js';
import '../../lib/thirdparty/theme-solarized_dark.js';
import '../../lib/thirdparty/theme-solarized_light.js';
import '../../lib/thirdparty/theme-tomorrow.js';
import '../../lib/thirdparty/theme-tomorrow_night';
import '../../lib/helpers/helperFunctions.js';
import './compileContract.html';

/**
Template Controllers

@module Templates
*/

/**
The compile contract template

Example usage

    {{> elements_compileContract onlyByteCode=true/false codeNotExecutable=true/false}}

@class [template] elements_compileContract
@constructor
*/
Template['elements_compileContract'].onCreated(function() {
    var template = this;

    // set the defaults
    TemplateVar.set('txData', '');
    TemplateVar.set('constructorInputs', []);
    TemplateVar.set('selectedType', this.data.onlyByteCode ? 'byte-code' : 'source-code');
    TemplateVar.set('compiledContracts', JSON.parse(localStorage['compiledContracts'] || null));
    TemplateVar.set('selectedContract', JSON.parse(localStorage['selectedContract'] || null));


    // focus the editors
    this.autorun(function(c) {
        // react in the selectedType
        var value = TemplateVar.get('selectedType');

        // focus the editors
        if(!c.firstRun) {
            Tracker.afterFlush(function() {
                if(value === 'byte-code')
                    template.$('.dapp-data-textarea').focus();
                else
                    template.aceEditor.focus();
            });
        }

    });


    // re-run the compile data, to assure that remote elements are made reactive
    var runDelayed = new Tracker.Dependency;

    setTimeout(function(){
        runDelayed.changed();
        runDelayed = null;
    }, 1000);

    // update and generate the contract data 
    this.autorun(function() {

        if(runDelayed)
            runDelayed.depend();
        
        // selected contract
        var selectedContract = TemplateVar.get('selectedContract');
        var constructorInputs = _.clone(TemplateVar.get('constructorInputs'));
        var selectedToken = TemplateVar.getFrom('.select-token', 'selectedToken');
        var selectedType = TemplateVar.get('selectedType');
        var textareaData = TemplateVar.getFrom('.dapp-data-textarea', 'value');
        var txData = '';

        if(selectedType && selectedType === 'source-code' && selectedContract){  
            // add the default chain3 sendTransaction arguments
            constructorInputs.push({
                data: selectedContract.bytecode
            });
    
            // generate new contract code
            // TemplateVar.set('txData', );
            txData = chain3.mc.contract(selectedContract.jsonInterface).new.getData.apply(null, constructorInputs);
            TemplateVar.set('contract', selectedContract);
    
            // Save data to localstorage
            localStorage.setItem('selectedContract', JSON.stringify(selectedContract));

        } else {
            // Bytecode Data  
            if (!selectedToken || selectedToken === 'mc') {

                // send mc         
                txData = (TemplateVar.get('show')) ? textareaData : '';

            }
        }
        
        TemplateVar.set("txData", txData);   
    });
});

editor = {};
Template['elements_compileContract'].onRendered(function() {
    var template = this;

    this.aceEditor = ace.edit('contract-source-editor');
    this.aceEditor.setOptions({
        useWorker: false,
        minLines: 10,
        maxLines: 30,
        highlightActiveLine: false
    });
    this.aceEditor.setTheme('ace/theme/tomorrow');
    this.aceEditor.getSession().setMode('ace/mode/typescript');
    this.aceEditor.$blockScrolling = Infinity;
    this.aceEditor.focus();

    var defaultCode = localStorage['contractSource'] || Helpers.getDefaultContractExample();
    this.aceEditor.setValue(defaultCode);
    this.aceEditor.selection.selectTo(0);

    editor = this.aceEditor;

    // WATCH FOR CHANGES
    this.aceEditor.getSession().on('change', _.debounce(function(e) {
        var sourceCode = template.aceEditor.getValue();

        localStorage.setItem('contractSource', sourceCode);

        TemplateVar.set(template, 'compiling', true);
        TemplateVar.set(template, 'compileError', false);

        sourceCode =  
                {"sol":
                    {"content": sourceCode},
                };

        var solc; 
        var input;

        // https://rawgit.com/ethereum/solc-bin/gh-pages/bin/soljson-latest.js
        BrowserSolc.loadVersion("/solc-bin.js", function(compiler) {
            Meteor.setTimeout(function(argument) {
                solc = compiler;

                input = JSON.stringify({
                    language: 'Solidity',
                    sources: sourceCode,
                    settings: {
                      optimizer: {
                        enabled: false,
                        runs: 200
                      },
                    //   libraries: opts.libraries,
                      outputSelection: {
                        '*': {
                          '': [ 'legacyAST' ],
                          '*': [ 'abi', 'metadata', 'devdoc', 'userdoc', 'evm.legacyAssembly', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers', 'evm.gasEstimates' ]
                        }
                      }
                    }
                  });
                
                // read the fields again
                Tracker.afterFlush(function() {
                    TemplateVar.set(template, 'compiling', false);
                    template.$('.abi-input').trigger('input');
                });

                // clean all error markers
                _.each(editor.session.$backMarkers, function(i) { 
                    editor.session.removeMarker(i.id);
                })

                var compiledContracts = solc.compileStandardWrapper(input, function () {});
                compiledContracts = JSON.parse(compiledContracts);
                //console.log(compiledContracts);

                if (typeof compiledContracts !== 'undefined')
                {
                    if(typeof compiledContracts['errors'] === 'undefined' || compiledContracts['errors'].toString().indexOf("Error")===-1)
                    {
                        compiledContracts = _.map(compiledContracts.contracts.sol, function(contract, name){
                            var jsonInterface = contract.abi;
                            
                            // find the constructor function
                            var constructor = _.find(jsonInterface, function(func){
                                return func.type == 'constructor';
                            });
        
                            // substring the type so that string32 and string16 wont need different templates
                            if(constructor) {
                                constructor.inputs = _.map(constructor.inputs, Helpers.createTemplateDataFromInput)
                            } else {
                                constructor = {
                                    inputs: []
                                };
                            }

                            return {
                                name: name,
                                bytecode: '0x' + contract.evm.bytecode.object.replace(/^0x/, ''),
                                jsonInterface: jsonInterface,
                                constructorInputs: constructor.inputs
                            };
                        });

                        TemplateVar.set(template, 'selectedContract', false);
                        TemplateVar.set(template, 'compiledContracts', compiledContracts);
                        localStorage.setItem('compiledContracts', JSON.stringify(compiledContracts));
                        console.log(jsonInterface);
                    }
                    else{
                        // Converts error into multiple bits
                        var errorLine = compiledContracts['errors'].filter(function(elem){
                            return elem.indexOf("Error")!==-1
                        }).toString().split(':');
        
                        if (errorLine.length < 4) {
                            // If it can't break the error then return all
                            TemplateVar.set(template, 'compileError', error);
                        } else {
                            // Finds a ^____^ pattern
                            var foundPattern = errorLine[4].match(/(\^-*\^)/g);
                            var errorLength = (foundPattern)? foundPattern[0].length : 0;

                            // Hightlights the error
                            var Range = ace.require('ace/range').Range;
                            editor.session.addMarker(new Range(errorLine[1]-1, 0, errorLine[1]-1, 200), "errorMarker");
                            editor.session.addMarker(new Range(errorLine[1]-1, errorLine[2]-1, errorLine[1]-1, Number(errorLine[2]) + errorLength), "errorMarker");

                            // Doesnt compile in solidity either, throw error
                            TemplateVar.set(template, 'compileError', errorLine[4]);  
                        }

                        TemplateVar.set(template, 'compiledContracts', false);
                        TemplateVar.set(template, 'selectedContract', false);
                    }
                }
            }, 100);
        });  
    }, 600));
});

Template['elements_compileContract'].onDestroyed(function() {
    if(this.aceEditor)
        this.aceEditor.destroy();
});

Template['elements_compileContract'].helpers({
    /**
    This helper will react to changes of the data context

    @method (reactiveContext)
    */
    'reactiveContext': function() {
        if(this.onlyByteCode) {
            TemplateVar.set('selectedType', 'byte-code');

            Tracker.nonreactive(function(){
                if(_.isEmpty(TemplateVar.getFrom('.dapp-data-textarea', 'value'))) {
                    TemplateVar.set('show', false);
                }
            });

        } else {
            TemplateVar.set('show', true);
        }
    },
    /**
    Get selected contract functions

    @method (selectedContractInputs)
    */
    'selectedContractInputs' : function(){
        selectedContract = TemplateVar.get('selectedContract');        
        return selectedContract ? selectedContract.constructorInputs : [];
    }
});


Template['elements_compileContract'].events({
    /**
        Click to reveal the jsonInterface

        @event click .interface-button
        */
    'click .interface-button': function(e){
        e.preventDefault();
        var selectedContract = TemplateVar.get("selectedContract");
        var jsonInterface = selectedContract.jsonInterface;
        console.log(jsonInterface);

        //clean ABI from circular references
        var cleanJsonInterface = _.map(jsonInterface, function(e, i) {
            return _.omit(e, 'contractInstance');
        })

        // Open a modal showing the QR Code
        McElements.Modal.show({
            template: 'views_modals_interface',
            data: {
                jsonInterface: cleanJsonInterface
            }
        });
    },
    /**
    Show the extra data field
    
    @event click button.show-data
    */
    'click button.show-data': function(e){
        e.preventDefault();
        TemplateVar.set('show', true);
    },
    /**
    Show the extra data field
    
    @event click button.hide-data
    */
    'click button.hide-data': function(e, template){
        e.preventDefault();
        TemplateVar.setTo('.dapp-data-textarea', 'value', '');
        Tracker.afterFlush(function(){
            TemplateVar.set(template, 'show', false);
        });
    },
    /**
    Textfield switcher
    
    @event click .dapp-segmented-control input
    */
    'click .dapp-segmented-control input': function(e, template){
        TemplateVar.set('selectedType', e.currentTarget.value);
    },
    /**
    Selected a contract function
    
    @event 'change .contract-functions
    */
    'change .compiled-contracts': function(e, template){
        // set a contract as selected
        var compiledContracts = TemplateVar.get('compiledContracts');

        _.each(compiledContracts, function(contract){
            contract.selected = contract.name == e.currentTarget.value;
        })

        // get the correct contract
        var selectedContract = _.find(compiledContracts, function(contract){
            return contract.selected;
        })

        // change the inputs and data field
        TemplateVar.set('selectedContract', selectedContract);
        TemplateVar.set('compiledContracts', compiledContracts);
        localStorage.setItem('compiledContracts', JSON.stringify(compiledContracts));

        Tracker.afterFlush(function(){
            // Run all inputs through formatter to catch bools
            template.$('.abi-input').trigger('change');
        });
    },
    /**
    Compile the solidty code, when
    
    @event change abi-input, input .abi-input
    */
    'change .abi-input, input .abi-input': function(e, template){
        var selectedContract = TemplateVar.get("selectedContract");
        var inputs = Helpers.addInputValue(selectedContract.constructorInputs, this, e.currentTarget);

        TemplateVar.set('constructorInputs', inputs);
    },
    /**
    Change the data

    @event change textarea.dapp-data-textarea
    */
    'change textarea.dapp-data-textarea': function(e){
        var value = e.currentTarget.value;
        TemplateVar.set('txData', value);
    }
});