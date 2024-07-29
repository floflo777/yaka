const ethers = require("ethers");

(async () => {
  const provider = new ethers.providers.JsonRpcProvider('https://evm-rpc.sei-apis.com');
  const contractAddress = "0x9f3B1c6b0CDDfE7ADAdd7aadf72273b38eFF0ebC";
  const startBlock = 91000000;
  const currentBlock = await provider.getBlockNumber();
  const rateLimit = 10000;

  const abi = [
    "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, tuple(address from, address to, bool stable)[] path, address to, uint256 deadline)",
    "function swapExactETHForTokens(uint256 amountOutMin, tuple(address from, address to, bool stable)[] path, address to, uint256 deadline)",
    "function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, tuple(address from, address to, bool stable)[] path, address to, uint256 deadline)",
    "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256 amountIn, uint256 amountOutMin, tuple(address from, address to, bool stable)[] path, address to, uint256 deadline)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
  ];

  const contractInterface = new ethers.utils.Interface(abi);

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const getTokenDetails = async (tokenAddress) => {
    const tokenContract = new ethers.Contract(tokenAddress, ["function decimals() view returns (uint8)", "function symbol() view returns (string)"], provider);
    try {
      const [decimals, symbol] = await Promise.all([tokenContract.decimals(), tokenContract.symbol()]);
      return { decimals, symbol };
    } catch (error) {
      console.error(`Error fetching details for token ${tokenAddress}: ${error.message}`);
      return { decimals: 18, symbol: "Unknown" };
    }
  };

  const formatWithDecimals = (amount, decimals) => ethers.utils.formatUnits(amount, decimals);

  const transactionsAggregated = {};

  const aggregateTransactions = (date, tokenAddress, tokenSymbol, amountIn, decimals) => {
    const formattedAmount = parseFloat(formatWithDecimals(amountIn, decimals));
    if (!transactionsAggregated[date]) transactionsAggregated[date] = {};
    if (!transactionsAggregated[date][tokenAddress]) transactionsAggregated[date][tokenAddress] = { symbol: tokenSymbol, totalAmount: 0 };
    transactionsAggregated[date][tokenAddress].totalAmount += formattedAmount;
    console.log(transactionsAggregated)
  };

  const getTransactions = async (blockNumber) => {
    if (blockNumber % 1000 === 0) console.log(`Fetching transactions for block ${blockNumber}`);
    const block = await provider.getBlockWithTransactions(blockNumber);
    const blockDate = new Date(block.timestamp * 1000).toLocaleDateString("en-GB");
  
    for (const tx of block.transactions) {
      if (tx.to && tx.to.toLowerCase() === contractAddress.toLowerCase()) {
        try {
          const decodedInput = contractInterface.parseTransaction({ data: tx.data });
          if (decodedInput) {
            console.log(`Transaction ${tx.hash} in block ${blockNumber}: ${decodedInput.name}`);
            let amountIn = decodedInput.args.amountIn; // Default for token to token swaps
            const { amountOutMin, path } = decodedInput.args;
  
            // Handle ETH swaps specifically
            if (decodedInput.name === 'swapExactETHForTokens' || decodedInput.name === 'swapExactETHForTokensSupportingFeeOnTransferTokens') {
              amountIn = tx.value; // Use ETH sent as amountIn
            }
  
            for (const [tokenA, ,] of path) {
              const { decimals, symbol } = await getTokenDetails(tokenA);
              aggregateTransactions(blockDate, tokenA, symbol, amountIn, decimals);
            }
          }
        } catch (error) {
          console.error(`Error decoding transaction ${tx.hash}: ${error.message}`);
        }
      }
    }
    await delay(1000 / rateLimit);
  };
  

  for (let i = startBlock; i <= currentBlock; i++) {
    await getTransactions(i);
    await delay(1000 / rateLimit);
  }

  console.log(transactionsAggregated);
})();

