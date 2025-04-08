import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_KEY = process.env.ALCHEMY_API_KEY;

// Create factory functions instead of direct exports
export const createPricesClient = () => axios.create({
  baseURL: 'https://api.g.alchemy.com/prices/v1/tokens',
  headers: {
    'accept': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  },
});
  
export const createMultiChainTokenClient = () => axios.create({
  baseURL: `https://api.g.alchemy.com/data/v1/${API_KEY}/assets/tokens`,
  headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
  },
});

export const createMultiChainTransactionHistoryClient = () => axios.create({
  baseURL: `https://api.g.alchemy.com/data/v1/${API_KEY}/transactions/history`,
  headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
  },
});

export const createNftClient = (network = 'eth-mainnet') => axios.create({
  baseURL: `https://${network}.g.alchemy.com/nft/v3/${API_KEY}`,
  headers: {
    'accept': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  },
});

export const createAlchemyJsonRpcClient = (network = 'eth-mainnet') => {
  const client = axios.create({
    baseURL: `https://${network}.g.alchemy.com/v2/${API_KEY}`,
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    }
  });
  
  // Add an interceptor to automatically include JSON-RPC fields
  client.interceptors.request.use((config) => {
    // Only add the default fields if it's a POST request
    if (config.method === 'post') {
      config.data = {
        id: 1,
        jsonrpc: "2.0",
        ...config.data
      };
    }
    return config;
  });
  
  return client;
};