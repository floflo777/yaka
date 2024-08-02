const config = require("./config.json");

TICKER0 = config.token0;
TICKER1 = config.token1;
TOKEN0 = config.addresses[TICKER0];
TOKEN1 = config.addresses[TICKER1];
STABLE = config.stable;
AMOUNT = config.amount;
BACKFORTH = config.backforth;
SWAPNB = config.swapNumber;
AMOUNT0 = config.amount0;
AMOUNT1 = config.amount1;

module.exports = {
    TICKER0,
    TICKER1,
    TOKEN0,
    TOKEN1,
    STABLE,
    AMOUNT,
    BACKFORTH,
    SWAPNB,
    AMOUNT0,
    AMOUNT1
}
