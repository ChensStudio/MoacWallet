#!/bin/sh

message="Please input -t/-p for TEST/PROD environment."
target="exit"

for i in "$@"
do
case $i in
    -t|--test)
        message="Delivered to TEST."
        target="yang_chen@walletbeta.moac.io:/home/yang_chen"
    ;;
    -p|--prod)
        message="Delivered to PROD"
        target="moac@52.43.43.32:/home/moac"
    ;;
esac
done

if test ${target} != "exit"
then
    #curl -o ./public/solc-bin.js https://rawgit.com/ethereum/solc-bin/gh-pages/bin/soljson-latest.js
    #curl -o ./public/solc-bin.js https://rawgit.com/ethereum/solc-bin/gh-pages/bin/soljson-v0.4.21+commit.dfe3193c.js
    curl -o ./public/solc-bin.js https://rawgit.com/ethereum/solc-bin/gh-pages/bin/soljson-v0.4.24+commit.e67f0147.js
    meteor build --architecture os.linux.x86_64  ../build/MoacWallet
    scp -i /Users/ychen/innowells/pem/gcp ../build/MoacWallet/MoacWallet.tar.gz ${target}
fi

echo ${message}