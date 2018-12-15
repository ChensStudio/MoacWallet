import {Template} from 'meteor/templating';
import '../../lib/helpers/templateHelpers';
import './accountLink.html';
/**
The account link template

@class [template] elements_account_link
@constructor
*/


Template['elements_account_link'].helpers({
    /**
    Get the account and return the account or address of "from" or "to" property

    @method (getAccount)
    */
    'getAccount': function(){
        //console.log('get address',Helpers.getAccountByAddress(this.address) || {address: chain3.toChecksumAddress(this.address)});
        return Helpers.getAccountByAddress(this.address) || {address: chain3.toChecksumAddress(this.address)};
    },
    /**
    Adds class about ens

    @method (ensClass)
    */
    'ensClass': function(){
        return this.ens ?  'ens-name' : 'not-ens-name';
    },
    /**
    Displays ENS names with triangles

    @method (nameDisplay)
    */
    // 'displayName': function(){
    //     return this.ens ? this.name.split('.').slice(0, -1).reverse().join(' ▸ ') : this.name;
    // },
    /**
    Displays ENS names with triangles

    @method (nameDisplay)
    */
    'tryENS': function(){
        var template = Template;
        var _this = this;

        Helpers.getENSName(this.address, function(err, name, returnedAddr) {
            if (err) {
                console.log(err)
            } else if (this.address.toLowerCase() == returnedAddr ){
                console.log('ens', name, _this, template);
                // _this.name = name;
                // TemplateVar.set(template, 'ensName', name)
            }
        });


    },
    'isMicroContract':function(){
        // console.log(this);
        // if (!MicroChainContracts.findOne({address: this.address}) && !CustomContracts.findOne({address: this.address})){
        //     return true;
        // }
        return MicroChainContracts.findOne({address: this.address})?true:false;
    }
});