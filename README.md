## Install the repository :

Download Node JS 20.0.0 on your computer. Create a ssh key and save the password. Then copy these commands in your terminal :
```bash
cp git@github.com:floflo777/yaka.git
cd yaka
cp .env.template .env
```
Fill in your private key in the .env file.

## Use the repository :
### Swap one token for another or create a swap loop :

Go to the config.json file and fill it with your parameters. Token0 is the token you want to swap and Token1 the one you want to receive. If you can't find these tokens in the addresses array, then import the addresses manually.
Stable is the type of swap you want to use. It can be stable or volatile (true or false). I'd advise to let it be true.
If you want to swap only one time from token0 to token1, fill the amount you want to swap and put backforth to false.
If you want to swap from token0 to token1 and from token1 to token0 back and forth, put this parameter to true, the amount of time you want to do it and the amounts you want to swap back and forth. 
Then copy these commands :
```bash
node src/swaps.js
```

### Fetch your volume and find how many points you'll earn :
copy these commands :
```bash
node src/points.js
node src/prices.js
node src/volume.js
```
Note that this programm will fetch every swap since a given block number that you can change manually in the volume.js file. If you have a free RPC provider like the one you will find in the code, then it might take as much as 12hrs to fetch every swap for a single day. Meaning you would have to run the programm half of the time to be able to compute your points. However you can buy better RPC providers and be faster.

Computing points automatically will allow you to know in advance which days have more swap volumes than others, which means you can adapt your own volume to swap more on low volume days and less on high volume days to earn more points per dollar spent as swap fees.


