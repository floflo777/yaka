const Web3 = require('web3');

const seiRpcUrl = 'https://evm-rpc.sei-apis.com';
const web3 = new Web3(seiRpcUrl);

const contractAddress = '0x0000000000000000000000000000000000001004';
const contractABI = [
    {
        "constant": true,
        "inputs": [{"name": "addr", "type": "address"}],
        "name": "getSeiAddr",
        "outputs": [{"name": "response", "type": "string"}],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{"name": "addr", "type": "string"}],
        "name": "getEvmAddr",
        "outputs": [{"name": "response", "type": "address"}],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
];

const contract = new web3.eth.Contract(contractABI, contractAddress);

async function getSEIAddress(evmAddress) {
    try {
        const seiAddress = await contract.methods.getSeiAddr(evmAddress).call();
        console.log('SEI Address:', seiAddress);
        return seiAddress;
    } catch (error) {
        console.error('Error fetching SEI address:', error);
    }
}

async function getEVMAddress(seiAddress) {
    try {
        const evmAddress = await contract.methods.getEvmAddr(seiAddress).call();
        console.log('EVM Address:', evmAddress);
        return evmAddress;
    } catch (error) {
        console.error('Error fetching EVM address:', error);
    }
}

const exampleEvmAddress = '0xb75d0b03c06a926e488e2659df1a861f860bd3d1'; 
const exampleSeiAddress = 'sei1uv87m52c5t3mz05m4kh2ht7929hft6x8letwrr'; 
getSEIAddress(exampleEvmAddress);
getEVMAddress(exampleSeiAddress);

