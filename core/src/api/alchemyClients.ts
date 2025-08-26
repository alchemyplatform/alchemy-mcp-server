import { ALCHEMY_API_KEY } from '@alchemy/mcp-config';
import axios from 'axios';

const BREADCRUMB_HEADER = "alchemy-mcp"

const resolveApiKey = (apiKey?: string): string => {
  if (apiKey) return apiKey;
  
  if (!ALCHEMY_API_KEY) {
    throw new Error('ALCHEMY_API_KEY not found in environment variables');
  }
  return ALCHEMY_API_KEY;
};

export const createPricesClient = (apiKey?: string) => {
  const key = resolveApiKey(apiKey);
  return axios.create({
    baseURL: `https://api.g.alchemy.com/prices/v1/${key}/tokens`,
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'x-alchemy-client-breadcrumb': BREADCRUMB_HEADER
    },
  });
};
  
export const createMultiChainTokenClient = (apiKey?: string) => {
  const key = resolveApiKey(apiKey);
  return axios.create({
    baseURL: `https://api.g.alchemy.com/data/v1/${key}/assets/tokens`,
    headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-alchemy-client-breadcrumb': BREADCRUMB_HEADER
    },
  });
};

export const createMultiChainTransactionHistoryClient = (apiKey?: string) => {
  const key = resolveApiKey(apiKey);
  return axios.create({
    baseURL: `https://api.g.alchemy.com/data/v1/${key}/transactions/history`,
    headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-alchemy-client-breadcrumb': BREADCRUMB_HEADER
    },
  });
};

export const createAlchemyJsonRpcClient = (apiKey?: string, network = 'eth-mainnet') => {
  const key = resolveApiKey(apiKey);
  const client = axios.create({
    baseURL: `https://${network}.g.alchemy.com/v2/${key}`,
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'Authorization': `Bearer ${key}`,
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

export const createNftClient = (apiKey?: string) => {
  const key = resolveApiKey(apiKey);
  return axios.create({
    baseURL: `https://api.g.alchemy.com/data/v1/${key}/assets/nfts`,
    headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-alchemy-client-breadcrumb': BREADCRUMB_HEADER
    },
  });
};

export const createWalletClient = (apiKey?: string) => {
  const key = resolveApiKey(apiKey);
  const client = axios.create({
    baseURL: `https://api.g.alchemy.com/v2/${key}`,
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

