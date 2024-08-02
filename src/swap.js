const { ethers } = require('ethers');
require('dotenv').config();
const abi = require('../ABI.json');
let { TICKER0, TICKER1, TOKEN0, TOKEN1, STABLE, AMOUNT, BACKFORTH, SWAPNB, AMOUNT0, AMOUNT1 } = require('../config.js');

if (!process.env.PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY is not defined in the .env file');
}

const provider = new ethers.providers.JsonRpcProvider('https://evm-rpc.sei-apis.com');

const privateKey = process.env.PRIVATE_KEY;
const wallet = new ethers.Wallet(privateKey, provider);
const contractAddress = '0x9f3B1c6b0CDDfE7ADAdd7aadf72273b38eFF0ebC';
const contract = new ethers.Contract(contractAddress, abi, wallet);

const tokenAddresses = [TOKEN0, TOKEN1];
const tokenAbi = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)"
];
const tokenContracts = tokenAddresses.map(address => new ethers.Contract(address, tokenAbi, wallet));

async function getDecimals(tokenContract) {
  try {
    return await tokenContract.decimals();
  } catch (error) {
    console.error(`Error getting decimals for token ${tokenContract.address}:`, error.message);
    throw error;
  }
}

async function getBalance(tokenContract) {
  try {
    return await tokenContract.balanceOf(wallet.address);
  } catch (error) {
    console.error(`Error getting balance for token ${tokenContract.address}:`, error.message);
    throw error;
  }
}

async function approveTokens(spender, amount) {
  try {
    for (const tokenContract of tokenContracts) {
      const decimals = await getDecimals(tokenContract);
      const amountToApprove = ethers.utils.parseUnits(amount, decimals);
      const tx = await tokenContract.approve(spender, amountToApprove);
      await tx.wait();
      console.log(`Tokens approved for contract ${tokenContract.address}:`, tx.hash);
    }
  } catch (error) {
    console.error('Error approving tokens:', error.message);
    throw error;
  }
}

async function getAmountOutMin(amountIn, priceImpactPercentage = 10) {
  try {
    const amountOutMin = amountIn.mul(ethers.BigNumber.from((100 - priceImpactPercentage).toString())).div(ethers.BigNumber.from('100'));
    return amountOutMin;
  } catch (error) {
    console.error('Error calculating amountOutMin:', error.message);
    throw error;
  }
}

async function tokensForSei(amount, decimals, token0=TOKEN0, token1=TOKEN1) {
  try {
    const amountIn = ethers.utils.parseUnits(amount, decimals);
    //const balance = await getBalance(tokenContracts[0]);

    /*if (balance.lt(amountIn)) {
      throw new Error('Insufficient token balance');
    }*/
    const amountOutMin = await getAmountOutMin(amountIn);

    const params = {
      amountIn,
      amountOutMin,
      components: [[token0, token1, STABLE]],
      to: wallet.address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
    };

    await approveTokens(contractAddress, amount);

    const tx = await contract.swapExactTokensForETH(params.amountIn, params.amountOutMin, params.components, params.to, params.deadline, { gasPrice: ethers.utils.parseUnits('1', 'gwei'), gasLimit: 1000000 });
    const receipt = await tx.wait();
    console.log(tx);
  } catch (error) {
    console.error('Error in tokensForSei:', error.message);
  }
}

async function seiForTokens(amount, decimals, token0=TOKEN0, token1=TOKEN1) {
  try {
    const amountIn = ethers.utils.parseUnits(amount, decimals);
    const amountOutMin = "0";
    
    const params = {
      amountIn,
      amountOutMin,
      components: [[token0, token1, STABLE]],
      to: wallet.address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
    };

    const tx = await contract.swapExactETHForTokens(params.amountOutMin, params.components, params.to, params.deadline, { value: params.amountIn, gasPrice: ethers.utils.parseUnits('1', 'gwei'), gasLimit: 1000000 });
    const receipt = await tx.wait();
    console.log(tx);
  } catch (error) {
    console.error('Error in seiForTokens:', error.message);
  }
}

async function tokenForToken(amount, decimals, token0=TOKEN0, token1=TOKEN1) {
  try {
    const amountIn = ethers.utils.parseUnits(amount, decimals);
    //const balance = await getBalance(tokenContracts[0]);

    /*if (balance.lt(amountIn)) {
      throw new Error('Insufficient token balance');
    }*/

    const amountOutMin = await getAmountOutMin(amountIn);

    const params = {
      amountIn,
      amountOutMin,
      components: [[token0, token1, STABLE]],
      to: wallet.address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
    };

    await approveTokens(contractAddress, amount);

    const tx = await contract.swapExactTokensForTokens(params.amountIn, params.amountOutMin, params.components, params.to, params.deadline, { gasPrice: ethers.utils.parseUnits('1', 'gwei'), gasLimit: 1000000 });
    const receipt = await tx.wait();
    console.log(tx);
  } catch (error) {
    console.error('Error in tokenForToken:', error.message);
  }
}

async function main() {
  try {
    const decimals0 = await getDecimals(tokenContracts[0]);
    const decimals1 = await getDecimals(tokenContracts[1]);
    const seiDecimals = 18;

    if (BACKFORTH == false) {
      if (TICKER0 === "SEI") {
        await seiForTokens(AMOUNT, decimals0);
      } else if (TICKER1 === "SEI") {
        await tokensForSei(AMOUNT, decimals0);
      } else {
        await tokenForToken(AMOUNT, decimals0);
      }
      return;
    }

    if (BACKFORTH) {
      for (let i = 0; i < SWAPNB; i++) {
        if (TICKER0==="SEI") {
          await seiForTokens(AMOUNT0, decimals0);
          await tokensForSei(AMOUNT1, decimals1, TOKEN1, TOKEN0);
        } else if (TICKER1==="SEI") {
          await tokensForSei(AMOUNT0, decimals0);
          await seiForTokens(AMOUNT1, decimals1, TOKEN1, TOKEN0);
        } else {
          await tokenForToken(AMOUNT0, decimals0);
          await tokenForToken(AMOUNT1, decimals1, TOKEN1, TOKEN0);
        }
      }
    }

  } catch (error) {
    console.error('Error in main:', error.message);
  }
}

main();

