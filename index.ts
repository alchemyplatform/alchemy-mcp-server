import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { alchemyApi } from './api/alchemyApi.js';
import toISO8601 from './utils/toISO8601.js';

const server = new McpServer({
  name: "alchemy-mpc",
  version: "1.0.0",
});

// || ** PRICES API ** ||
// Get a token price by Symbol
server.tool('getTokenPriceBySymbol', {
  symbols: z.array(z.string()).describe('A list of token symbols to query. e.g. ["BTC", "ETH"]'),
}, async (params) => {
  try {
    const result = await alchemyApi.getTokenPriceBySymbol(params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in getTokenPriceBySymbol:', error);
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
    return {
      content: [{ type: "text", text: 'Unknown error occurred' }],
      isError: true
    };
  }
});

// Get a token price by token contract address
server.tool('getTokenPriceByAddress', {
  addresses: z.array(z.object({
    address: z.string().describe('The token contract address to query. e.g. "0x1234567890123456789012345678901234567890"'),
    network: z.string().describe('The blockchain network to query. e.g. "eth-mainnet" or "base-mainnet"')
  })).describe('A list of token contract address and network pairs'),
}, async (params) => {
  try {
    const result = await alchemyApi.getTokenPriceByAddress(params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in getTokenPriceByAddress:', error);
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
    return {
      content: [{ type: "text", text: 'Unknown error occurred' }],
      isError: true
    };
  }
});

// Get a token price history by Symbol
server.tool('getTokenPriceHistoryBySymbol', {
  symbol: z.string().describe('The token symbol to query. e.g. "BTC" or "ETH"'),
  startTime: z.string().describe('The start time date to query. e.g. "2021-01-01"'),
  endTime: z.string().describe('The end time date to query. e.g. "2021-01-01"'),
  interval: z.string().describe('The interval to query. e.g. "1d" or "1h"')
}, async (params) => {
  try {
    const result = await alchemyApi.getTokenPriceHistoryBySymbol({
      ...params,
      startTime: toISO8601(params.startTime),
      endTime: toISO8601(params.endTime)
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in getTokenPriceHistoryBySymbol:', error);
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
    return {
      content: [{ type: "text", text: 'Unknown error occurred' }],
      isError: true
    };
  }
});

// || ** MultiChain Token API ** ||

// Fetches current balances, prices, and metadata for multiple addresses using network and address pairs.
server.tool('getTokensByMultichainAddress', {
  addresses: z.array(z.object({
    address: z.string().describe('The wallet address to query. e.g. "0x1234567890123456789012345678901234567890"'),
    networks: z.array(z.string()).describe('The blockchain networks to query. e.g. ["eth-mainnet", "base-mainnet"]')
  })).describe('A list of wallet address and network pairs'),
}, async (params) => {
  try {
    const result = await alchemyApi.getTokensByMultichainAddress(params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in getTokensByMultichainAddress:', error);
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
    return {
      content: [{ type: "text", text: 'Unknown error occurred' }],
      isError: true
    };
  }
});

// Fetches current balances for multiple addresses using network and address pairs.
server.tool('getTokenBalancesByMultichainWallet', {
  addresses: z.array(z.object({
    address: z.string().describe('The wallet address to query. e.g. "0x1234567890123456789012345678901234567890"'),
    networks: z.array(z.string()).describe('The blockchain networks to query. e.g. ["eth-mainnet", "base-mainnet"]')
  })).describe('A list of wallet address and network pairs'),
}, async (params) => {
  try {
    const result = await alchemyApi.getTokenBalancesByMultichainWallet(params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in getTokenBalancesByMultichainWallet:', error);
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
    return {
      content: [{ type: "text", text: 'Unknown error occurred' }],
      isError: true
    };
  }
});

// || ** NFT API ** ||

// Get NFTs owned by an address
server.tool('getNFTsForOwner', {
  owner: z.string(),
  withMetadata: z.boolean().default(false).optional(),
  pageKey: z.string().optional(),
  pageSize: z.number().default(100).optional(),
  contractAddresses: z.array(z.string()).optional(),
  excludeFilters: z.array(z.string()).optional(),
  tokenUriTimeoutInMs: z.number().optional(),
  spamConfidenceLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional()
}, async (params) => {
  try {
    const result = await alchemyApi.getNFTsForOwner(params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('Detailed error:', {
        message: error.message,
        // @ts-ignore
        response: error.response?.data,
        // @ts-ignore
        config: error.config
      });
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
    return {
      content: [{ type: "text", text: 'Unknown error occurred' }],
      isError: true
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport); 
