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
    // scsApi.url = 'http://127.0.0.1:1337/rpc'
    // scsApi.url = 'http://139.198.126.104:8546/rpc'
    // scsApi.url = 'http://35.196.114.202:50068/rpc'
    // scsApi.contractAddress = '0xf6a97597540165b9accd3837adfb7d1e77397bc1'
    // scsApi.abi = [{"constant":false,"inputs":[],"name":"list","outputs":[{"name":"count","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"fileHash","type":"string"}],"name":"read","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"fileHash","type":"string"}],"name":"remove","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"fileHashes","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"s1","type":"string"},{"name":"s2","type":"string"}],"name":"compareStringsbyBytes","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"pure","type":"function"},{"constant":false,"inputs":[{"name":"fileHash","type":"string"}],"name":"write","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"}]
    // scsApi.sender = '0x18e926ad1821e38597368b606be81de580f46686'
    // scsApi.initFlag = true;
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