import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { alchemyApi } from './api/alchemyApi.js';
import { convertTimestampToDate } from './utils/convertTimestampToDate.js';
import { convertWeiToEth } from './utils/ethConversions.js';
import { calculateDateRange, parseNaturalLanguageTimeFrame, toISO8601 } from './utils/dateUtils.js';

interface ServerContext {
  apiKey?: string;
}

export function createServer(version: string = "0.0.0", context?: ServerContext): McpServer {
  const server = new McpServer({
    name: "alchemy-mcp-server",
    version,
  });

  // || ** PRICES API ** ||
  // Fetch the price of a token by it's symbol eg. "BTC" or "ETH"
  server.tool('fetchTokenPriceBySymbol', {
    symbols: z.array(z.string()).describe('A list of blockchaintoken symbols to query. e.g. ["BTC", "ETH"]'),
  }, async (params) => {
    try {
      const result = await alchemyApi.getTokenPriceBySymbol(params, context?.apiKey);
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

  // Fetch the price of a token by the token contract address
  server.tool('fetchTokenPriceByAddress', {
    addresses: z.array(z.object({
      address: z.string().describe('The token contract address to query. e.g. "0x1234567890123456789012345678901234567890"'),
      network: z.string().describe('The blockchain network to query. e.g. "eth-mainnet" or "base-mainnet"')
    })).describe('A list of token contract address and network pairs'),
  }, async (params) => {
    try {
      const result = await alchemyApi.getTokenPriceByAddress(params, context?.apiKey);
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

  // Fetch the price history of a token by Symbol
  server.tool('fetchTokenPriceHistoryBySymbol', {
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
      }, context?.apiKey);
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

  // Fetch token price history using various time frame formats or natural language
  server.tool('fetchTokenPriceHistoryByTimeFrame', {
    symbol: z.string().describe('The token symbol to query. e.g. "BTC" or "ETH"'),
    timeFrame: z.string().describe('Time frame like "last-week", "past-7d", "ytd", "last-month", etc. or use natural language like "last week"'),
    interval: z.string().default('1d').describe('The interval to query. e.g. "1d" or "1h"'),
    useNaturalLanguageProcessing: z.boolean().default(false).describe('If true, will interpret timeFrame as natural language'),
  }, async (params) => {
    try {
      let timeFrame = params.timeFrame;
      if (params.useNaturalLanguageProcessing) {
        timeFrame = parseNaturalLanguageTimeFrame(params.timeFrame);
      }
      const { startDate, endDate } = calculateDateRange(timeFrame);
      const result = await alchemyApi.getTokenPriceHistoryBySymbol({
        symbol: params.symbol,
        startTime: startDate,
        endTime: endDate,
        interval: params.interval
      }, context?.apiKey);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error in fetchTokenPriceHistoryByTimeFrame:', error);
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
  server.tool('fetchTokensOwnedByMultichainAddresses', {
    addresses: z.array(z.object({
      address: z.string().describe('The wallet address to query. e.g. "0x1234567890123456789012345678901234567890"'),
      networks: z.array(z.string()).describe('The blockchain networks to query. e.g. ["eth-mainnet", "base-mainnet"]')
    })).describe('A list of wallet address and network pairs'),
  }, async (params) => {
    try {
      const result = await alchemyApi.getTokensByMultichainAddress(params, context?.apiKey);
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

  // || ** MultiChain Transaction History API ** ||
  server.tool('fetchAddressTransactionHistory', {
    addresses: z.array(z.object({
      address: z.string().describe('The wallet address to query. e.g. "0x1234567890123456789012345678901234567890"'),
      networks: z.array(z.string()).describe('The blockchain networks to query. e.g. ["eth-mainnet", "base-mainnet"]')
    })).describe('A list of wallet address and network pairs'),
    before: z.string().optional().describe('The cursor that points to the previous set of results. Use this to paginate through the results.'),
    after: z.string().optional().describe('The cursor that points to the next set of results. Use this to paginate through the results.'),
    limit: z.number().default(25).optional().describe('The number of results to return. Default is 25. Max is 100')
  }, async (params) => {  
    try {
      let result = await alchemyApi.getTransactionHistoryByMultichainAddress(params, context?.apiKey);
      const formattedTxns = result.transactions.map((transaction: any) => ({
        ...transaction,
        date: convertTimestampToDate(transaction.blockTimestamp),
        ethValue: convertWeiToEth(transaction.value)
      }));
      result.transactions = formattedTxns;
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error in getTransactionHistoryByMultichainAddress:', error);
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

  // || ** TRANSFERS API ** ||
  server.tool('fetchTransfers', {
    fromBlock: z.string().default('0x0').describe('The block number to start the search from. e.g. "1234567890". Inclusive from block (hex string, int, latest, or indexed).'),
    toBlock: z.string().default('latest').describe('The block number to end the search at. e.g. "1234567890". Inclusive to block (hex string, int, latest, or indexed).'),
    fromAddress: z.string().optional().describe('The wallet address to query the transfer was sent from.'),
    toAddress: z.string().optional().describe('The wallet address to query the transfer was sent to.'),
    contractAddresses: z.array(z.string()).default([]).describe('The contract addresses to query. e.g. ["0x1234567890123456789012345678901234567890"]'),
    category: z.array(z.string()).default(['external', 'erc20']).describe('The category of transfers to query. e.g. "external" or "internal"'),
    order: z.string().default('asc').describe('The order of the results. e.g. "asc" or "desc".'),
    withMetadata: z.boolean().default(false).describe('Whether to include metadata in the results.'),
    excludeZeroValue: z.boolean().default(true).describe('Whether to exclude zero value transfers.'),
    maxCount: z.string().default('0xA').describe('The maximum number of results to return. e.g. "0x3E8".'),
    pageKey: z.string().optional().describe('The cursor to start the search from. Use this to paginate through the results.'),
    network: z.string().default('eth-mainnet').describe('The blockchain network to query. e.g. "eth-mainnet" or "base-mainnet").'),
    
  }, async (params) => {
    try {
      const result = await alchemyApi.getAssetTransfers(params, context?.apiKey);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error in fetchTransfers:', error);
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
  server.tool('fetchNftsOwnedByMultichainAddresses', {
    addresses: z.array(z.object({
      address: z.string().describe('The wallet address to query. e.g. "0x1234567890123456789012345678901234567890"'),
      networks: z.array(z.string()).default(['eth-mainnet']).describe('The blockchain networks to query. e.g. ["eth-mainnet", "base-mainnet"]'),
      excludeFilters: z.array(z.enum(['SPAM', 'AIRDROPS'])).default(["SPAM", "AIRDROPS"]).describe('The filters to exclude from the results. e.g. ["SPAM", "AIRDROPS"]'),
      includeFilters: z.array(z.enum(['SPAM', 'AIRDROPS'])).default([]).describe('The filters to include in the results. e.g. ["SPAM", "AIRDROPS"]'),
      spamConfidenceLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']).default('VERY_HIGH').describe('The spam confidence level to query. e.g. "LOW" or "HIGH"'),
    })).describe('A list of wallet address and network pairs'),
    withMetadata: z.boolean().default(true).describe('Whether to include metadata in the results.'),
    pageKey: z.string().optional().describe('The cursor to start the search from. Use this to paginate through the results.'),
    pageSize: z.number().default(10).describe('The number of results to return. Default is 100. Max is 100'),
  }, async (params) => {
    try {
      const result = await alchemyApi.getNftsForAddress(params, context?.apiKey);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error in getNFTsForOwner:', error);
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

  // Fetch the contract data for an NFT owned by a singular or multiple wallet addresses across multiple blockchain networks
  // The returned response from the LLM should show information about the NFT contract not the specific NFTs held by the wallet address at that contract
  server.tool('fetchNftContractDataByMultichainAddress', {
    addresses: z.array(z.object({
      address: z.string().describe('The wallet address to query. e.g. "0x1234567890123456789012345678901234567890"'),
      networks: z.array(z.string()).default(['eth-mainnet']).describe('The blockchain networks to query. e.g. ["eth-mainnet", "base-mainnet"]'),
    })).describe('A list of wallet address and network pairs'),
    withMetadata: z.boolean().default(true).describe('Whether to include metadata in the results.'),
  }, async (params) => {
    try {
      const result = await alchemyApi.getNftContractsByAddress(params, context?.apiKey);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error in getNftContractsByAddress:', error);
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

  // || ** WALLET API ** ||
  server.tool('sendTransaction', {
    ownerScaAccountAddress: z.string().describe('The owner SCA account address.'),
    signerAddress: z.string().describe('The signer address to send the transaction from.'),
    toAddress: z.string().describe('The address to send the transaction to.'),
    value: z.string().optional().describe('The value of the transaction in ETH.'),
    callData: z.string().optional().describe('The data of the transaction.'),
    }, async (params) => {
      try {
        const result = await alchemyApi.sendTransaction(params);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error in sendTransaction:', error);
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

  // || ** SWAP API ** ||
  server.tool('swap', {
    ownerScaAccountAddress: z.string().describe('The owner SCA account address.'),
    signerAddress: z.string().describe('The signer address to send the transaction from.')
  }, async (params) => {
    try {
      const result = await alchemyApi.swap(params);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error in swap:', error);
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

  return server;
}


