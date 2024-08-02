const ethers = require("ethers");
const fs = require("fs");
const csv = require("csv-parser");
const transactionsAggregated = {};

const loadCSV = async (filePath, keyColumn, valueColumn) => {
  const data = {};
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        if (row[keyColumn] && row[valueColumn]) {
          data[row[keyColumn].toLowerCase()] = parseFloat(row[valueColumn]);
        }
      })
      .on("end", () => {
        resolve(data);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
};

const createProviders = (urls) => {
  return urls.map(url => new ethers.providers.JsonRpcProvider(url));
};

const getTokenDetails = async (provider, tokenAddress) => {
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

const aggregateTransactions = (transactionsAggregated, dateTime, userAddress, tokenAddress, tokenSymbol, amountIn, decimals, tokenPrice, userBoost, blockNumber) => {
  const time = dateTime.split(' ')[1];
  const date = dateTime.split(' ')[0];
  const formattedAmount = parseFloat(formatWithDecimals(amountIn, decimals));
  const volumeInDollars = formattedAmount * tokenPrice;
  const weightedVolume = volumeInDollars * (1 + userBoost);

  if (!transactionsAggregated[date]) {
    transactionsAggregated[date] = {};
  }
  if (!transactionsAggregated[date][tokenAddress]) {
    transactionsAggregated[date][tokenAddress] = { symbol: tokenSymbol, totalAmount: 0, totalVolume: 0, weightedVolume: 0, transactions: {} };
  }

  if (!transactionsAggregated[date][tokenAddress].transactions[time]) {
    transactionsAggregated[date][tokenAddress].transactions[time] = { weightedVolume: 0 };
  }

  transactionsAggregated[date][tokenAddress].transactions[time].weightedVolume += weightedVolume;
  transactionsAggregated[date][tokenAddress].totalAmount += formattedAmount;
  transactionsAggregated[date][tokenAddress].totalVolume += volumeInDollars;
  transactionsAggregated[date][tokenAddress].weightedVolume += weightedVolume;
  transactionsAggregated["lastBlock"] = blockNumber;

  console.log(JSON.stringify(transactionsAggregated, null, 2));
};

const getTransactions = async (provider, startBlock, endBlock, contractAddress, contractInterface, tokenPrices, userRankings, rateLimit) => {
  for (let i = startBlock; i <= endBlock; i++) {
    if (i % 1000 === 0) console.log(`Provider ${provider.connection.url}: Fetching transactions for block ${i}`);
    const block = await provider.getBlockWithTransactions(i);
    if (block.transactions.length === 0) continue;
    const dateTime = new Date(block.timestamp * 1000).toLocaleString("en-GB", { hour12: false });

    for (const tx of block.transactions) {
      if (tx.to && tx.to.toLowerCase() === contractAddress.toLowerCase()) {
        try {
          const decodedInput = contractInterface.parseTransaction({ data: tx.data });
          if (decodedInput) {
            console.log(`Transaction ${tx.hash} in block ${i}: ${decodedInput.name}`);
            let amountIn = decodedInput.args.amountIn;
            const { amountOutMin, path } = decodedInput.args;

            if (decodedInput.name === 'swapExactETHForTokens' || decodedInput.name === 'swapExactETHForTokensSupportingFeeOnTransferTokens') {
              amountIn = tx.value;
            }

            for (const [tokenA, ,] of path) {
              const { decimals, symbol } = await getTokenDetails(provider, tokenA);
              const tokenPrice = tokenPrices[tokenA.toLowerCase()] || 0;
              const userBoost = userRankings[tx.from.toLowerCase()] || 0;
              aggregateTransactions(transactionsAggregated, dateTime, tx.from, tokenA, symbol, amountIn, decimals, tokenPrice, userBoost, block.number);
            }
          }
        } catch (error) {
          console.error(`Error decoding transaction ${tx.hash}: ${error.message}`);
        }
      }
    }
  }

  return transactionsAggregated;
};

(async () => {
  const contractAddress = "0x9f3B1c6b0CDDfE7ADAdd7aadf72273b38eFF0ebC";
  const startBlock = 92850000;
  const currentBlock = await (new ethers.providers.JsonRpcProvider('https://evm-rpc.sei-apis.com')).getBlockNumber();
  const rateLimit = 92741296;
  const providerUrls = [
    'https://evm-rpc.sei-apis.com'
  ];

  const abi = [
    "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, tuple(address from, address to, bool stable)[] path, address to, uint256 deadline)",
    "function swapExactETHForTokens(uint256 amountOutMin, tuple(address from, address to, bool stable)[] path, address to, uint256 deadline)",
    "function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, tuple(address from, address to, bool stable)[] path, address to, uint256 deadline)",
    "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256 amountIn, uint256 amountOutMin, tuple(address from, address to, bool stable)[] path, address to, uint256 deadline)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
  ];

  const contractInterface = new ethers.utils.Interface(abi);

  const tokenPrices = await loadCSV("token_prices.csv", "address", "price");
  const userRankings = await loadCSV("user_rankings.csv", "address", "boost");

  const providers = createProviders(providerUrls);
  const blocksPerProvider = Math.ceil((currentBlock - startBlock + 1) / providers.length);
  const promises = providers.map((provider, index) => {
    const providerStartBlock = startBlock + (index * blocksPerProvider);
    const providerEndBlock = Math.min(startBlock + ((index + 1) * blocksPerProvider) - 1, currentBlock);
    return getTransactions(provider, providerStartBlock, providerEndBlock, contractAddress, contractInterface, tokenPrices, userRankings, rateLimit);
  });

  const results = await Promise.all(promises);

  const combinedAggregated = results.reduce((acc, result) => {
    for (const [date, tokens] of Object.entries(result)) {
      if (!acc[date]) acc[date] = {};
      for (const [token, data] of Object.entries(tokens)) {
        if (!acc[date][token]) {
          acc[date][token] = { symbol: data.symbol, totalAmount: 0, totalVolume: 0, weightedVolume: 0, transactions: {} };
        }
        Object.entries(data.transactions).forEach(([time, transaction]) => {
          if (!acc[date][token].transactions[time]) {
            acc[date][token].transactions[time] = { weightedVolume: 0 };
          }
          acc[date][token].transactions[time].weightedVolume += transaction.weightedVolume;
        });
        acc[date][token].totalAmount += data.totalAmount;
        acc[date][token].totalVolume += data.totalVolume;
        acc[date][token].weightedVolume += data.weightedVolume;
      }
    }
    return acc;
  }, {});

  console.log(JSON.stringify(combinedAggregated, null, 2));
})();
