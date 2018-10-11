import { HTTP } from 'meteor/http'

/**
Helper functions

@module scsApi
**/

/**
The Helpers class containing helper functions

@class scsApi
@constructor
**/

scsApi = {initFlag : false};


scsApi.init = function () {
    if (!scsApi.initFlag) {
        scsApi.options = {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
            }
        };
    }
};
  
scsApi.request = function(bodyJSON, rpcaddr, rpcport, sender, subChainAddr, callback) {
    scsApi.init();
    scsApi.url = 'http://' + rpcaddr + ':' + rpcport + '/rpc';
    scsApi.sender = sender;
    scsApi.contractAddress = subChainAddr;
    scsApi.options.data = bodyJSON; 

    var result = HTTP.call("POST", scsApi.url, scsApi.options, callback);
    return result;
};
  
scsApi.getNonce = function(rpcaddr, rpcport, sender, subChainAddr, callback) {
    if (!subChainAddr) {
        subChainAddr = scsApi.contractAddress;
    }
    if (!sender) {
        sender = scsApi.sender;
    }
    var bodyJSON = { "jsonrpc": "2.0", "id": 0, "method": "ScsRPCMethod.GetNonce", "params": {"Sender": sender, "SubChainAddr": subChainAddr} };
    return scsApi.request(bodyJSON, rpcaddr, rpcport, sender, subChainAddr, callback);
};

scsApi.anyCall = function(rpcaddr, rpcport, sender, subChainAddr, funcName, callback) {
    if (!subChainAddr) {
        subChainAddr = scsApi.contractAddress;
    }
    if (!sender) {
        sender = scsApi.sender;
    }
    var bodyJSON = { "jsonrpc": "2.0", "id": 0, "method": "ScsRPCMethod.AnyCall", "params": {"Sender": sender, "SubChainAddr": subChainAddr, "Params": [funcName]} };
    return scsApi.request(bodyJSON, rpcaddr, rpcport, sender, subChainAddr, callback);
};

scsApi.setDappAbi = function(rpcaddr, rpcport, sender, subChainAddr, abi, callback) {
    if (!subChainAddr) {
        subChainAddr = scsApi.contractAddress;
    }
    if (!sender) {
        sender = scsApi.sender;
    }
    var bodyJSON = { "jsonrpc": "2.0", "id": 0, "method": "ScsRPCMethod.SetDappAbi", "params": {"Sender": sender, "Data": abi, "SubChainAddr": subChainAddr}};
    return scsApi.request(bodyJSON, rpcaddr, rpcport, sender, subChainAddr, callback);
};

scsApi.getDappState = function(rpcaddr, rpcport, sender, subChainAddr, callback) {
    if (!subChainAddr) {
        subChainAddr = scsApi.contractAddress;
    }
    if (!sender) {
        sender = scsApi.sender;
    }
    var bodyJSON = { "jsonrpc": "2.0", "id": 0, "method": "ScsRPCMethod.GetDappState", "params": {"Sender": sender, "SubChainAddr": subChainAddr}};
    return scsApi.request(bodyJSON, rpcaddr, rpcport, sender, subChainAddr, callback);
};

scsApi.getStorageAt = function(rpcaddr, rpcport, subChainAddr, keyName, callback) {
    if (!subChainAddr) {
        subChainAddr = scsApi.contractAddress;
    }

    var bodyJSON = { "jsonrpc": "2.0", "id": 0, "method": "ScsRPCMethod.GetStorageAt", "params": {"SubChainAddr": subChainAddr, "Keys": [keyName]}};
    return scsApi.request(bodyJSON, rpcaddr, rpcport, sender, subChainAddr, callback);
};

scsApi.getBlockNumber = function(rpcaddr, rpcport, subChainAddr, callback) {
    if (!subChainAddr) {
        subChainAddr = scsApi.contractAddress;
    }
    
    var sender = '0x0000000000000000000000000000000000000000';
    var bodyJSON = { "jsonrpc": "2.0", "id": 0, "method": "ScsRPCMethod.GetBlockNumber", "params": {"Sender": sender, "SubChainAddr": subChainAddr}};
    return scsApi.request(bodyJSON, rpcaddr, rpcport, sender, subChainAddr, callback);
};