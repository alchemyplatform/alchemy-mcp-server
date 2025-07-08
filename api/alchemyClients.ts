import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_KEY = process.env.ALCHEMY_API_KEY;
const BREADCRUMB_HEADER = "alchemy-mcp"

export const createPricesClient = () => axios.create({
  baseURL: `https://api.g.alchemy.com/prices/v1/${API_KEY}/tokens`,
  headers: {
    'accept': 'application/json',
    'content-type': 'application/json',
    'x-alchemy-client-breadcrumb': BREADCRUMB_HEADER
  },
});
  
export const createMultiChainTokenClient = () => axios.create({
  baseURL: `https://api.g.alchemy.com/data/v1/${API_KEY}/assets/tokens`,
  headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'x-alchemy-client-breadcrumb': BREADCRUMB_HEADER
  },
});

export const createMultiChainTransactionHistoryClient = () => axios.create({
  baseURL: `https://api.g.alchemy.com/data/v1/${API_KEY}/transactions/history`,
  headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'x-alchemy-client-breadcrumb': BREADCRUMB_HEADER
  },
});

export const createAlchemyJsonRpcClient = (network = 'eth-mainnet') => {
  const client = axios.create({
    baseURL: `https://${network}.g.alchemy.com/v2/${API_KEY}`,
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'x-alchemy-client-breadcrumb': BREADCRUMB_HEADER
    }
  });
  
  client.interceptors.request.use((config) => {
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

export const createNftClient = () => axios.create({
  baseURL: `https://api.g.alchemy.com/data/v1/${API_KEY}/assets/nfts`,
  headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'x-alchemy-client-breadcrumb': BREADCRUMB_HEADER
  },
});

export const createWalletClient = () => {
  const client = axios.create({
    baseURL: `https://api.g.alchemy.com/v2/${API_KEY}`,
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json'
    }
  });
  
  client.interceptors.request.use((config) => {
    if (config.method === 'post') {
      if (config.data && config.data.method) {
        config.data = {
          id: 1,
          jsonrpc: "2.0",
          method: config.data.method,
          params: config.data.params
        };
      }
    }
    return config;
  });
  
  return client;
};
