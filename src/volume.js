const ethers = require("ethers");

(async () => {
  const provider = new ethers.providers.JsonRpcProvider('https://evm-rpc.sei-apis.com');
  const contractAddress = "0x9f3B1c6b0CDDfE7ADAdd7aadf72273b38eFF0ebC";
  const startBlock = 92350348;
  const currentBlock = await provider.getBlockNumber();
  const rateLimit = 50;

  const abi = [
    "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, tuple(address tokenA, address tokenB, bool feeOnTransfer)[] path, address to, uint256 deadline)",
    "function decimals() view returns (uint8)"
  ];
  const contractInterface = new ethers.utils.Interface(abi);

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const getDecimals = async (tokenAddress) => {
    const tokenContract = new ethers.Contract(tokenAddress, ["function decimals() view returns (uint8)"], provider);
    try {
      return await tokenContract.decimals();
    } catch (error) {
      console.error(`Error fetching decimals for token ${tokenAddress}: ${error.message}`);
      return 18;
    }
  };

  const formatWithDecimals = (amount, decimals) => ethers.utils.formatUnits(amount, decimals);

  const getTransactions = async (blockNumber) => {
    const block = await provider.getBlock(blockNumber);
    console.log(`Analyzing block number: ${block.number}`)
    const transactions = [];
    for (const txHash of block.transactions) {
      const tx = await provider.getTransaction(txHash);
      if (tx.to && tx.to.toLowerCase() === contractAddress.toLowerCase()) {
        try {
          const decodedInput = contractInterface.parseTransaction({ data: tx.data });
          if (decodedInput && decodedInput.name === 'swapExactTokensForTokens') {
            const { amountIn, amountOutMin, path } = decodedInput.args;
            console.log(`Transaction ${txHash} in block ${blockNumber}:`);
            
            // Fetch and format amounts using token decimals
            const tokenADecimals = await getDecimals(path[0][0]);
            const tokenBDecimals = await getDecimals(path[0][1]);
            console.log(`Amount In: ${formatWithDecimals(amountIn, tokenADecimals)} ${path[0][0]}`);
            console.log(`Amount Out Min: ${formatWithDecimals(amountOutMin, tokenBDecimals)} ${path[0][1]}`);

            path.forEach(([tokenA, tokenB, feeOnTransfer], index) => {
              console.log(`Path ${index + 1}:`);
              console.log(`  Token A Address: ${tokenA}`);
              console.log(`  Token B Address: ${tokenB}`);
              console.log(`  Fee on Transfer: ${feeOnTransfer}`);
            });
            transactions.push(tx);
          }
        } catch (error) {
          console.error(`Error decoding transaction ${txHash}: ${error.message}`);
        }
      }
      await delay(1000 / rateLimit);
    }
    return transactions;
  };

  for (let i = startBlock; i <= currentBlock; i++) {
    await getTransactions(i);
    await delay(1000 / rateLimit);
  }
})();
