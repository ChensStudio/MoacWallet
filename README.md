# Moac Wallet Ðapp

The Moac wallet. Change from Ethereum Wallet Dapp.

**NOTE** The wallet is not yet official released,
can contain severe bugs!  
  
## Need to change for MOAC
Please search Need to change for MOAC for those places

## Development  
Start an `moac` node and the app using meteor and open http://localhost:3000 in your browser:  

Test Net:  
    $ moac --testnet --rpccorsdomain "http://localhost:3000" --rpc --unlock <your account>  
Main:  
    $ moac --rpccorsdomain "http://localhost:3000" --rpc --unlock <your account>  

Starting the wallet dapp using [Meteor](https://meteor.com/install)

    $ cd MoacWallet
    $ meteor

Go to http://localhost:3000


## Deployment

To create a build version of your app run:

    $ meteor build --architecture os.linux.x86_64  ../build/MoacWallet_build/
