const { ethers } = require('ethers');
require('dotenv').config();
require('colors');

if (!process.env.PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY is not defined in the .env file');
}

const provider = new ethers.providers.JsonRpcProvider('https://evm-rpc.sei-apis.com');
const privateKey = process.env.PRIVATE_KEY; 
const wallet = new ethers.Wallet(privateKey, provider);
const contractAddress = '0x9f3B1c6b0CDDfE7ADAdd7aadf72273b38eFF0ebC';

const tokenAbi = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address owner) public view returns (uint256)"
];

const tokenAddresses = [
  '0x5cf6826140c1c56ff49c808a1a75407cd1df9423'
  //'0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7'
];
const tokenContracts = tokenAddresses.map(address => new ethers.Contract(address, tokenAbi, wallet));


async function getBalances() {
  for (const tokenContract of tokenContracts) {
    const balance = await tokenContract.balanceOf(wallet.address);
    console.log(`ISEI balance : ${ethers.utils.formatUnits(balance, 6)}`.yellow);
  }
}

async function sendRawTransaction() {
  let count = 0;
  await getBalances();
  let balance = await provider.getBalance(wallet.address);
  console.log(`SEI balance: ${ethers.utils.formatUnits(balance, 18)}`.yellow);

  while (true) {
    const nonce = await provider.getTransactionCount(wallet.address);
    const tx1 = {
        to: contractAddress,
        value: ethers.utils.parseUnits('10', 'ether'),
        gasLimit: 294902,
        gasPrice: ethers.utils.parseUnits('1', 'gwei'),
        nonce: nonce,
        data: '0x67ffb66a00000000000000000000000000000000000000000000000000000000009463b100000000000000000000000000000000000000000000000000000000000000800000000000000000000000001972fe04fb77257b984bdfae9cb4712b734318220000000000000000000000000000000000000000000000000000000066c4018e0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000e30fedd158a2e3b13e9badaeabafc5516e95e8c70000000000000000000000005cf6826140c1c56ff49c808a1a75407cd1df94230000000000000000000000000000000000000000000000000000000000000001'
    };
    try {
        const signedTx = await wallet.signTransaction(tx1);
        //console.log('Signed transaction:', signedTx);
        const sentTx = await provider.sendTransaction(signedTx);
        //console.log('Transaction sent:', sentTx.hash);
        const receipt = await sentTx.wait();
        //console.log('Transaction mined:', receipt);
        console.log('1 : Swapped 10 SEI for 10 ISEI'.red)
        count += 1;
    } catch (error) {
        console.error('Error during transaction sending:'/*, error*/);
        await getBalances();
        let balance = await provider.getBalance(wallet.address);
        console.log(`SEI balance: ${ethers.utils.formatUnits(balance, 18)}`.yellow);
    }

    const nonce2 = await provider.getTransactionCount(wallet.address);
    const tx2 = {
        to: contractAddress,
        gasLimit: 294902,
        gasPrice: ethers.utils.parseUnits('1', 'gwei'),
        nonce: nonce2,
        data: '0x18a1308600000000000000000000000000000000000000000000000000000000009896800000000000000000000000000000000000000000000000008e4e21b5f28a11c900000000000000000000000000000000000000000000000000000000000000a00000000000000000000000001972fe04fb77257b984bdfae9cb4712b734318220000000000000000000000000000000000000000000000000000000066c4018e00000000000000000000000000000000000000000000000000000000000000010000000000000000000000005cf6826140c1c56ff49c808a1a75407cd1df9423000000000000000000000000e30fedd158a2e3b13e9badaeabafc5516e95e8c70000000000000000000000000000000000000000000000000000000000000001'
    };
    try {
        const signedTx = await wallet.signTransaction(tx2);
        //console.log('Signed transaction:', signedTx);
        const sentTx = await provider.sendTransaction(signedTx);
        //console.log('Transaction sent:', sentTx.hash);
        const receipt = await sentTx.wait();
        //console.log('Transaction mined:', receipt);
        console.log('2 : Swapped 10 ISEI for 10 SEI'.green)
        count += 1;
    } catch (error) {
        console.error('Error during transaction sending:'/*, error*/);
        await getBalances();
        balance = await provider.getBalance(wallet.address);
        console.log(`SEI balance: ${ethers.utils.formatUnits(balance, 18)}`.yellow);
    }

    if (count%10 == 0) {
        console.log(count);
        await getBalances();
        balance = await provider.getBalance(wallet.address);
        console.log(`SEI balance: ${ethers.utils.formatUnits(balance, 18)}`.yellow);
    }
  }
}

sendRawTransaction();
