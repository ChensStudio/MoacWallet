#!/bin/sh

message="Please input -t/-p for TEST/PROD environment."
target="exit"

for i in "$@"
do
case $i in
    -t|--test)
        message="Delivered to TEST."
        target="ubuntu@52.15.143.41:/home/ubuntu"
        pem="-i /Users/ychen/innowells/pem/awswallet.pem"
    ;;
    -p|--prod)
        message="Delivered to PROD"
        target="moac@52.43.43.32:/home/moac"
        pem = ""
    ;;
esac
done

if test ${target} != "exit"
then
    #curl -o ./public/solc-bin.js https://rawgit.com/ethereum/solc-bin/gh-pages/bin/soljson-latest.js
    #curl -o ./public/solc-bin.js https://rawgit.com/ethereum/solc-bin/gh-pages/bin/soljson-v0.4.21+commit.dfe3193c.js
    curl -o ./public/solc-bin.js https://rawgit.com/ethereum/solc-bin/gh-pages/bin/soljson-v0.4.24+commit.e67f0147.js
    meteor build --architecture os.linux.x86_64  ../build/MoacWallet
    scp ${pem} ../build/MoacWallet/MoacWallet.tar.gz ${target}
fi

echo ${message}