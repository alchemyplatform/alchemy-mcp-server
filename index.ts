#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { alchemyApi } from './api/alchemyApi.js';
import { convertTimestampToDate } from './utils/convertTimestampToDate.js';
import { convertWeiToEth } from './utils/ethConversions.js';
import { calculateDateRange, parseNaturalLanguageTimeFrame, toISO8601 } from './utils/dateUtils.js';
const server = new McpServer({
  name: "alchemy-mcp-server",
  version: "0.2.0-rc.0",
});

// Standard tool handler to reduce boilerplate for tools that just call an API method and return JSON
const handleToolCall = (fn: (params: any) => Promise<any>, name: string) => async (params: any) => {
  try {
    const result = await fn(params);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error in ${name}:`, error);
      return {
        content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: 'Unknown error occurred' }],
      isError: true,
    };
  }
};

// ========================================
// PRICES API
// ========================================

// Fetch the price of a token by it's symbol eg. "BTC" or "ETH"
server.tool('fetchTokenPriceBySymbol', {
  symbols: z.array(z.string()).describe('A list of blockchaintoken symbols to query. e.g. ["BTC", "ETH"]'),
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

// Fetch the price of a token by the token contract address
server.tool('fetchTokenPriceByAddress', {
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

// Fetch token price history using various time frame formats or natural language
server.tool('fetchTokenPriceHistoryByTimeFrame', {
  symbol: z.string().describe('The token symbol to query. e.g. "BTC" or "ETH"'),
  timeFrame: z.string().describe('Time frame like "last-week", "past-7d", "ytd", "last-month", etc. or use natural language like "last week"'),
  interval: z.string().default('1d').describe('The interval to query. e.g. "1d" or "1h"'),
  useNaturalLanguageProcessing: z.boolean().default(false).describe('If true, will interpret timeFrame as natural language'),
}, async (params) => {
  try {
    // Process time frame - either directly or through NLP
    let timeFrame = params.timeFrame;
    if (params.useNaturalLanguageProcessing) {
      timeFrame = parseNaturalLanguageTimeFrame(params.timeFrame);
    }

    // Calculate date range
    const { startDate, endDate } = calculateDateRange(timeFrame);

    // Fetch the data
    const result = await alchemyApi.getTokenPriceHistoryBySymbol({
      symbol: params.symbol,
      startTime: startDate,
      endTime: endDate,
      interval: params.interval
    });

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

// ========================================
// MultiChain Token API
// ========================================

// Fetch the current balance, price, and metadata of the tokens owned by specific addresses using network and address pairs.
// The returned response from the LLM should be formatted in an easy to read table format.
server.tool('fetchTokensOwnedByMultichainAddresses', {
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

// ========================================
// MultiChain Transaction History API
// ========================================

// Fetch the transaction history of singular or multiple wallet addresses using multiple blockchain networks.
// The returned response from the LLM should list out transactions with data and dates not just summarize them.
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
    let result = await alchemyApi.getTransactionHistoryByMultichainAddress(params);
    // List the transaction hash when returning the result to the user
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

// ========================================
// TRANSFERS API
// ========================================

// Fetch the transfers and transaction history for any address
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
    const result = await alchemyApi.getAssetTransfers(params);
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

// ========================================
// NFT API (multichain)
// ========================================

// Fetch the NFTs owned by a singular or multiple wallet addresses across multiple blockchain networks.
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
    const result = await alchemyApi.getNftsForAddress(params);
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
    const result = await alchemyApi.getNftContractsByAddress(params);
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

// ========================================
// WALLET API
// ========================================

// Send a transaction to a specific address using the owner SCA account address and the signer address
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
  })

// ========================================
// SWAP API
// ========================================

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

// ========================================
// NFT v3 API
// ========================================

server.tool('getNFTsForOwner', {
  owner: z.string().describe('The wallet address of the NFT owner'),
  contractAddresses: z.array(z.string()).optional().describe('Filter by specific NFT contract addresses'),
  withMetadata: z.boolean().default(true).describe('Whether to include NFT metadata'),
  pageKey: z.string().optional().describe('Pagination cursor for next page'),
  pageSize: z.number().default(100).describe('Number of NFTs to return per page (max 100)'),
  excludeFilters: z.array(z.string()).optional().describe('Filters to exclude: SPAM, AIRDROPS'),
  orderBy: z.string().optional().describe('Order results by: transferTime'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.getNFTsForOwnerV3(params), 'getNFTsForOwner'));

server.tool('getNFTsForContract', {
  contractAddress: z.string().describe('The NFT contract address'),
  withMetadata: z.boolean().default(true).describe('Whether to include NFT metadata'),
  startToken: z.string().optional().describe('Token ID to start from for pagination'),
  limit: z.number().default(100).describe('Max number of NFTs to return'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.getNFTsForContract(params), 'getNFTsForContract'));

server.tool('getNFTsForCollection', {
  collectionSlug: z.string().describe('The collection slug identifier'),
  withMetadata: z.boolean().default(true).describe('Whether to include NFT metadata'),
  startToken: z.string().optional().describe('Token ID to start from for pagination'),
  limit: z.number().default(100).describe('Max number of NFTs to return'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.getNFTsForCollection(params), 'getNFTsForCollection'));

server.tool('getNFTMetadata', {
  contractAddress: z.string().describe('The NFT contract address'),
  tokenId: z.string().describe('The token ID of the NFT'),
  tokenType: z.string().optional().describe('The token type: ERC721 or ERC1155'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.getNFTMetadata(params), 'getNFTMetadata'));

server.tool('getContractMetadata', {
  contractAddress: z.string().describe('The NFT contract address'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.getContractMetadata(params), 'getContractMetadata'));

server.tool('getCollectionMetadata', {
  collectionSlug: z.string().describe('The collection slug identifier'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.getCollectionMetadata(params), 'getCollectionMetadata'));

server.tool('getOwnersForNFT', {
  contractAddress: z.string().describe('The NFT contract address'),
  tokenId: z.string().describe('The token ID of the NFT'),
  pageKey: z.string().optional().describe('Pagination cursor for next page'),
  pageSize: z.number().optional().describe('Number of results per page'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.getOwnersForNFT(params), 'getOwnersForNFT'));

server.tool('getOwnersForContract', {
  contractAddress: z.string().describe('The NFT contract address'),
  withTokenBalances: z.boolean().default(false).describe('Include token balances per owner'),
  pageKey: z.string().optional().describe('Pagination cursor for next page'),
  block: z.string().optional().describe('Block number to query at'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.getOwnersForContract(params), 'getOwnersForContract'));

server.tool('getContractsForOwner', {
  owner: z.string().describe('The wallet address of the owner'),
  pageKey: z.string().optional().describe('Pagination cursor for next page'),
  pageSize: z.number().optional().describe('Number of results per page'),
  excludeFilters: z.array(z.string()).optional().describe('Filters to exclude: SPAM, AIRDROPS'),
  includeFilters: z.array(z.string()).optional().describe('Filters to include: SPAM, AIRDROPS'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.getContractsForOwner(params), 'getContractsForOwner'));

server.tool('getCollectionsForOwner', {
  owner: z.string().describe('The wallet address of the owner'),
  pageKey: z.string().optional().describe('Pagination cursor for next page'),
  pageSize: z.number().optional().describe('Number of results per page'),
  excludeFilters: z.array(z.string()).optional().describe('Filters to exclude: SPAM, AIRDROPS'),
  includeFilters: z.array(z.string()).optional().describe('Filters to include: SPAM, AIRDROPS'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.getCollectionsForOwner(params), 'getCollectionsForOwner'));

server.tool('isSpamContract', {
  contractAddress: z.string().describe('The contract address to check'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.isSpamContract(params), 'isSpamContract'));

server.tool('isAirdropNFT', {
  contractAddress: z.string().describe('The NFT contract address'),
  tokenId: z.string().describe('The token ID of the NFT'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.isAirdropNFT(params), 'isAirdropNFT'));

server.tool('isHolderOfContract', {
  wallet: z.string().describe('The wallet address to check'),
  contractAddress: z.string().describe('The NFT contract address'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.isHolderOfContract(params), 'isHolderOfContract'));

server.tool('getFloorPrice', {
  contractAddress: z.string().describe('The NFT contract address'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.getFloorPrice(params), 'getFloorPrice'));

server.tool('getNFTSales', {
  contractAddress: z.string().optional().describe('The NFT contract address'),
  tokenId: z.string().optional().describe('The token ID'),
  marketplace: z.string().optional().describe('Filter by marketplace (e.g. "seaport")'),
  order: z.string().optional().describe('Sort order: asc or desc'),
  limit: z.number().optional().describe('Max number of sales to return'),
  pageKey: z.string().optional().describe('Pagination cursor'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.getNFTSales(params), 'getNFTSales'));

server.tool('computeRarity', {
  contractAddress: z.string().describe('The NFT contract address'),
  tokenId: z.string().describe('The token ID'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.computeRarity(params), 'computeRarity'));

server.tool('summarizeNFTAttributes', {
  contractAddress: z.string().describe('The NFT contract address'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.summarizeNFTAttributes(params), 'summarizeNFTAttributes'));

server.tool('searchContractMetadata', {
  query: z.string().describe('Search query for NFT contract metadata'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.searchContractMetadata(params), 'searchContractMetadata'));

// ========================================
// TOKEN RPC API
// ========================================

server.tool('getTokenAllowance', {
  contract: z.string().describe('The token contract address'),
  owner: z.string().describe('The address of the token owner'),
  spender: z.string().describe('The address of the token spender'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.getTokenAllowance(params), 'getTokenAllowance'));

server.tool('getTokenBalances', {
  address: z.string().describe('The wallet address to query balances for'),
  tokenAddresses: z.array(z.string()).optional().describe('Specific token contract addresses to query. If omitted, returns all ERC-20 balances.'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.getTokenBalances(params), 'getTokenBalances'));

server.tool('getTokenMetadata', {
  contractAddress: z.string().describe('The token contract address'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.getTokenMetadata(params), 'getTokenMetadata'));

// ========================================
// TRANSACTION RECEIPTS API
// ========================================

server.tool('getTransactionReceipts', {
  blockNumber: z.string().optional().describe('The block number (hex) to get receipts for'),
  blockHash: z.string().optional().describe('The block hash to get receipts for'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.getTransactionReceipts(params), 'getTransactionReceipts'));

// ========================================
// TRANSACTION SIMULATION API
// ========================================

server.tool('simulateAssetChanges', {
  from: z.string().describe('The address the transaction is sent from'),
  to: z.string().describe('The address the transaction is sent to'),
  value: z.string().optional().describe('The value sent with the transaction (hex)'),
  data: z.string().optional().describe('The calldata of the transaction'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.simulateAssetChanges(params), 'simulateAssetChanges'));

server.tool('simulateExecution', {
  from: z.string().describe('The address the transaction is sent from'),
  to: z.string().describe('The address the transaction is sent to'),
  data: z.string().optional().describe('The calldata of the transaction'),
  value: z.string().optional().describe('The value sent with the transaction (hex)'),
  blockTag: z.string().optional().describe('Block tag: latest, safe, finalized, earliest'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.simulateExecution(params), 'simulateExecution'));

// ========================================
// TRACE API
// ========================================

server.tool('traceTransaction', {
  transactionHash: z.string().describe('The transaction hash to trace (32-byte hex)'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.traceTransaction(params), 'traceTransaction'));

server.tool('traceBlock', {
  blockIdentifier: z.string().describe('Block identifier: hex number or tag (earliest, latest, pending, safe, finalized)'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.traceBlock(params), 'traceBlock'));

server.tool('traceCall', {
  from: z.string().optional().describe('The from address'),
  to: z.string().describe('The to address'),
  gas: z.string().optional().describe('Gas limit (hex)'),
  gasPrice: z.string().optional().describe('Gas price (hex)'),
  value: z.string().optional().describe('Value to send (hex)'),
  data: z.string().optional().describe('Calldata'),
  traceTypes: z.array(z.string()).default(['trace']).describe('Trace types: trace, stateDiff'),
  blockIdentifier: z.string().optional().describe('Block identifier'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.traceCall(params), 'traceCall'));

server.tool('traceFilter', {
  fromBlock: z.string().optional().describe('Start block (hex or tag)'),
  toBlock: z.string().optional().describe('End block (hex or tag)'),
  fromAddress: z.array(z.string()).optional().describe('Filter by sender addresses'),
  toAddress: z.array(z.string()).optional().describe('Filter by recipient addresses'),
  after: z.number().optional().describe('Offset to start from'),
  count: z.number().optional().describe('Number of traces to return'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.traceFilter(params), 'traceFilter'));

server.tool('traceGet', {
  transactionHash: z.string().describe('The transaction hash (32-byte hex)'),
  traceIndexes: z.array(z.string()).describe('Array of trace index positions (hex)'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.traceGet(params), 'traceGet'));

// ========================================
// DEBUG API
// ========================================

server.tool('debugTraceTransaction', {
  transactionHash: z.string().describe('The transaction hash to debug trace (32-byte hex)'),
  tracer: z.string().optional().describe('Tracer type: callTracer, prestateTracer, etc.'),
  tracerConfig: z.record(z.any()).optional().describe('Configuration for the tracer'),
  timeout: z.string().optional().describe('Timeout for the trace operation'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.debugTraceTransaction(params), 'debugTraceTransaction'));

server.tool('debugTraceCall', {
  from: z.string().optional().describe('The from address'),
  to: z.string().describe('The to address'),
  gas: z.string().optional().describe('Gas limit (hex)'),
  gasPrice: z.string().optional().describe('Gas price (hex)'),
  value: z.string().optional().describe('Value to send (hex)'),
  data: z.string().optional().describe('Calldata'),
  blockIdentifier: z.string().optional().describe('Block identifier (hash, number, or tag)'),
  tracer: z.string().optional().describe('Tracer type: callTracer, prestateTracer, etc.'),
  tracerConfig: z.record(z.any()).optional().describe('Configuration for the tracer'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.debugTraceCall(params), 'debugTraceCall'));

server.tool('debugTraceBlockByNumber', {
  blockNumber: z.string().describe('Block number (hex or tag)'),
  tracer: z.string().optional().describe('Tracer type: callTracer, prestateTracer, etc.'),
  tracerConfig: z.record(z.any()).optional().describe('Configuration for the tracer'),
  network: z.string().default('eth-mainnet').describe('The blockchain network'),
}, handleToolCall((params) => alchemyApi.debugTraceBlockByNumber(params), 'debugTraceBlockByNumber'));

// ========================================
// SOLANA DAS API
// ========================================

server.tool('solanaGetAsset', {
  id: z.string().describe('The base-58 encoded asset ID'),
  network: z.string().default('solana-mainnet').describe('The Solana network'),
}, handleToolCall((params) => alchemyApi.solanaGetAsset(params), 'solanaGetAsset'));

server.tool('solanaGetAssets', {
  ids: z.array(z.string()).describe('Array of base-58 encoded asset IDs'),
  network: z.string().default('solana-mainnet').describe('The Solana network'),
}, handleToolCall((params) => alchemyApi.solanaGetAssets(params), 'solanaGetAssets'));

server.tool('solanaGetAssetProof', {
  id: z.string().describe('The base-58 encoded asset ID'),
  network: z.string().default('solana-mainnet').describe('The Solana network'),
}, handleToolCall((params) => alchemyApi.solanaGetAssetProof(params), 'solanaGetAssetProof'));

server.tool('solanaGetAssetsByOwner', {
  ownerAddress: z.string().describe('The Solana wallet address of the asset owner'),
  sortBy: z.string().optional().describe('Sort field: id, created, updated, recentAction, none'),
  sortDirection: z.string().optional().describe('Sort direction: asc or desc'),
  limit: z.number().default(1000).describe('Max results to return (max 1000)'),
  page: z.number().default(1).describe('Page number'),
  before: z.string().optional().describe('Cursor for pagination'),
  after: z.string().optional().describe('Cursor for pagination'),
  network: z.string().default('solana-mainnet').describe('The Solana network'),
}, handleToolCall((params) => alchemyApi.solanaGetAssetsByOwner(params), 'solanaGetAssetsByOwner'));

server.tool('solanaGetAssetsByAuthority', {
  authorityAddress: z.string().describe('The authority public key'),
  sortBy: z.string().optional().describe('Sort field: created, updated, recentAction, none'),
  sortDirection: z.string().optional().describe('Sort direction: asc or desc'),
  limit: z.number().default(1000).describe('Max results to return (max 1000)'),
  page: z.number().default(1).describe('Page number'),
  before: z.string().optional().describe('Cursor for pagination'),
  after: z.string().optional().describe('Cursor for pagination'),
  network: z.string().default('solana-mainnet').describe('The Solana network'),
}, handleToolCall((params) => alchemyApi.solanaGetAssetsByAuthority(params), 'solanaGetAssetsByAuthority'));

server.tool('solanaGetAssetsByCreator', {
  creatorAddress: z.string().describe('The creator public key'),
  onlyVerified: z.boolean().default(false).describe('Only return verified assets'),
  sortBy: z.string().optional().describe('Sort field: created, updated, recentAction, none'),
  sortDirection: z.string().optional().describe('Sort direction: asc or desc'),
  limit: z.number().default(1000).describe('Max results to return (max 1000)'),
  page: z.number().default(1).describe('Page number'),
  before: z.string().optional().describe('Cursor for pagination'),
  after: z.string().optional().describe('Cursor for pagination'),
  network: z.string().default('solana-mainnet').describe('The Solana network'),
}, handleToolCall((params) => alchemyApi.solanaGetAssetsByCreator(params), 'solanaGetAssetsByCreator'));

server.tool('solanaGetAssetsByGroup', {
  groupKey: z.string().describe('The group key (e.g. "collection")'),
  groupValue: z.string().describe('The group value (e.g. collection address)'),
  sortBy: z.string().optional().describe('Sort field: created, updated, recentAction, none'),
  sortDirection: z.string().optional().describe('Sort direction: asc or desc'),
  limit: z.number().default(1000).describe('Max results to return (max 1000)'),
  page: z.number().default(1).describe('Page number'),
  before: z.string().optional().describe('Cursor for pagination'),
  after: z.string().optional().describe('Cursor for pagination'),
  network: z.string().default('solana-mainnet').describe('The Solana network'),
}, handleToolCall((params) => alchemyApi.solanaGetAssetsByGroup(params), 'solanaGetAssetsByGroup'));

server.tool('solanaSearchAssets', {
  ownerAddress: z.string().optional().describe('Filter by owner address'),
  creatorAddress: z.string().optional().describe('Filter by creator address'),
  grouping: z.array(z.string()).optional().describe('Filter by grouping (group_key, group_value)'),
  burnt: z.boolean().optional().describe('Filter burnt assets'),
  limit: z.number().default(1000).describe('Max results to return (max 1000)'),
  page: z.number().default(1).describe('Page number'),
  before: z.string().optional().describe('Cursor for pagination'),
  after: z.string().optional().describe('Cursor for pagination'),
  network: z.string().default('solana-mainnet').describe('The Solana network'),
}, handleToolCall((params) => alchemyApi.solanaSearchAssets(params), 'solanaSearchAssets'));

server.tool('solanaGetAssetSignatures', {
  id: z.string().describe('The base-58 encoded asset ID'),
  limit: z.number().optional().describe('Max signatures to return'),
  page: z.number().optional().describe('Page number'),
  before: z.string().optional().describe('Cursor for pagination'),
  after: z.string().optional().describe('Cursor for pagination'),
  network: z.string().default('solana-mainnet').describe('The Solana network'),
}, handleToolCall((params) => alchemyApi.solanaGetAssetSignatures(params), 'solanaGetAssetSignatures'));

server.tool('solanaGetNftEditions', {
  mintAddress: z.string().describe('The master NFT mint address'),
  limit: z.number().optional().describe('Max editions to return'),
  page: z.number().optional().describe('Page number'),
  before: z.string().optional().describe('Cursor for pagination'),
  after: z.string().optional().describe('Cursor for pagination'),
  network: z.string().default('solana-mainnet').describe('The Solana network'),
}, handleToolCall((params) => alchemyApi.solanaGetNftEditions(params), 'solanaGetNftEditions'));

server.tool('solanaGetTokenAccounts', {
  mintAddress: z.string().optional().describe('Filter by mint address'),
  ownerAddress: z.string().optional().describe('Filter by owner address'),
  limit: z.number().optional().describe('Max accounts to return'),
  cursor: z.string().optional().describe('Pagination cursor'),
  network: z.string().default('solana-mainnet').describe('The Solana network'),
}, handleToolCall((params) => alchemyApi.solanaGetTokenAccounts(params), 'solanaGetTokenAccounts'));

// ========================================
// ETH BEACON API
// ========================================

server.tool('beaconGetBlockAttestations', {
  blockId: z.string().describe('Block identifier: head, genesis, finalized, <slot>, or <hex blockRoot>'),
}, handleToolCall((params) => alchemyApi.beaconGetBlockAttestations(params), 'beaconGetBlockAttestations'));

server.tool('beaconGetBlockRoot', {
  blockId: z.string().describe('Block identifier: head, genesis, finalized, <slot>, or <hex blockRoot>'),
}, handleToolCall((params) => alchemyApi.beaconGetBlockRoot(params), 'beaconGetBlockRoot'));

server.tool('beaconGetBlobSidecars', {
  blockId: z.string().describe('Block identifier: head, genesis, finalized, <slot>, or <hex blockRoot>'),
  indices: z.array(z.number()).optional().describe('Specific blob sidecar indices to return'),
}, handleToolCall((params) => alchemyApi.beaconGetBlobSidecars(params), 'beaconGetBlobSidecars'));

server.tool('beaconGetBlock', {
  blockId: z.string().describe('Block identifier: head, genesis, finalized, <slot>, or <hex blockRoot>'),
}, handleToolCall((params) => alchemyApi.beaconGetBlock(params), 'beaconGetBlock'));

server.tool('beaconGetGenesis', {
}, handleToolCall(() => alchemyApi.beaconGetGenesis(), 'beaconGetGenesis'));

server.tool('beaconGetHeaders', {
  slot: z.string().optional().describe('Filter by slot number'),
  parentRoot: z.string().optional().describe('Filter by parent root hash'),
}, handleToolCall((params) => alchemyApi.beaconGetHeaders(params), 'beaconGetHeaders'));

server.tool('beaconGetHeader', {
  blockId: z.string().describe('Block identifier: head, genesis, finalized, <slot>, or <hex blockRoot>'),
}, handleToolCall((params) => alchemyApi.beaconGetHeader(params), 'beaconGetHeader'));

server.tool('beaconGetVoluntaryExits', {
}, handleToolCall(() => alchemyApi.beaconGetVoluntaryExits(), 'beaconGetVoluntaryExits'));

server.tool('beaconGetPoolAttestations', {
}, handleToolCall(() => alchemyApi.beaconGetPoolAttestations(), 'beaconGetPoolAttestations'));

server.tool('beaconGetCommittees', {
  stateId: z.string().describe('State identifier: head, genesis, finalized, justified, <slot>, or <hex stateRoot>'),
  epoch: z.string().optional().describe('Fetch committees for this epoch'),
  index: z.string().optional().describe('Filter by committee index'),
  slot: z.string().optional().describe('Filter by slot'),
}, handleToolCall((params) => alchemyApi.beaconGetCommittees(params), 'beaconGetCommittees'));

server.tool('beaconGetFinalityCheckpoints', {
  stateId: z.string().describe('State identifier: head, genesis, finalized, justified, <slot>, or <hex stateRoot>'),
}, handleToolCall((params) => alchemyApi.beaconGetFinalityCheckpoints(params), 'beaconGetFinalityCheckpoints'));

server.tool('beaconGetFork', {
  stateId: z.string().describe('State identifier: head, genesis, finalized, justified, <slot>, or <hex stateRoot>'),
}, handleToolCall((params) => alchemyApi.beaconGetFork(params), 'beaconGetFork'));

server.tool('beaconGetPendingConsolidations', {
  stateId: z.string().describe('State identifier: head, genesis, finalized, justified, <slot>, or <hex stateRoot>'),
}, handleToolCall((params) => alchemyApi.beaconGetPendingConsolidations(params), 'beaconGetPendingConsolidations'));

server.tool('beaconGetStateRoot', {
  stateId: z.string().describe('State identifier: head, genesis, finalized, justified, <slot>, or <hex stateRoot>'),
}, handleToolCall((params) => alchemyApi.beaconGetStateRoot(params), 'beaconGetStateRoot'));

server.tool('beaconGetSyncCommittees', {
  stateId: z.string().describe('State identifier: head, genesis, finalized, justified, <slot>, or <hex stateRoot>'),
  epoch: z.string().optional().describe('Fetch sync committees for this epoch'),
}, handleToolCall((params) => alchemyApi.beaconGetSyncCommittees(params), 'beaconGetSyncCommittees'));

server.tool('beaconGetRandao', {
  stateId: z.string().describe('State identifier: head, genesis, finalized, justified, <slot>, or <hex stateRoot>'),
  epoch: z.string().describe('Epoch to retrieve the RANDAO mix for'),
}, handleToolCall((params) => alchemyApi.beaconGetRandao(params), 'beaconGetRandao'));

server.tool('beaconGetValidatorBalances', {
  stateId: z.string().describe('State identifier: head, genesis, finalized, justified, <slot>, or <hex stateRoot>'),
  id: z.array(z.string()).optional().describe('Filter by validator public keys or indices'),
}, handleToolCall((params) => alchemyApi.beaconGetValidatorBalances(params), 'beaconGetValidatorBalances'));

server.tool('beaconGetValidators', {
  stateId: z.string().describe('State identifier: head, genesis, finalized, justified, <slot>, or <hex stateRoot>'),
  id: z.array(z.string()).optional().describe('Filter by validator public keys or indices'),
  status: z.array(z.string()).optional().describe('Filter by validator status'),
}, handleToolCall((params) => alchemyApi.beaconGetValidators(params), 'beaconGetValidators'));

server.tool('beaconGetValidator', {
  stateId: z.string().describe('State identifier: head, genesis, finalized, justified, <slot>, or <hex stateRoot>'),
  validatorId: z.string().describe('Validator index or hex-encoded public key'),
}, handleToolCall((params) => alchemyApi.beaconGetValidator(params), 'beaconGetValidator'));

server.tool('beaconGetBlockRewards', {
  blockId: z.string().describe('Block identifier: head, genesis, finalized, <slot>, or <hex blockRoot>'),
}, handleToolCall((params) => alchemyApi.beaconGetBlockRewards(params), 'beaconGetBlockRewards'));

server.tool('beaconGetBlindedBlock', {
  blockId: z.string().describe('Block identifier: head, genesis, finalized, <slot>, or <hex blockRoot>'),
}, handleToolCall((params) => alchemyApi.beaconGetBlindedBlock(params), 'beaconGetBlindedBlock'));

// ========================================
// APTOS API
// ========================================

server.tool('aptosGetLedgerInfo', {
}, handleToolCall(() => alchemyApi.aptosGetLedgerInfo(), 'aptosGetLedgerInfo'));

server.tool('aptosCheckHealth', {
  durationSecs: z.number().optional().describe('Threshold in seconds for how far behind the server can be to still be considered healthy'),
}, handleToolCall((params) => alchemyApi.aptosCheckHealth(params), 'aptosCheckHealth'));

server.tool('aptosGetAccount', {
  address: z.string().describe('Aptos account address (with or without 0x prefix)'),
  ledgerVersion: z.string().optional().describe('Specific ledger version to query'),
}, handleToolCall((params) => alchemyApi.aptosGetAccount(params), 'aptosGetAccount'));

server.tool('aptosGetAccountResources', {
  address: z.string().describe('Aptos account address (with or without 0x prefix)'),
  ledgerVersion: z.string().optional().describe('Specific ledger version to query'),
}, handleToolCall((params) => alchemyApi.aptosGetAccountResources(params), 'aptosGetAccountResources'));

server.tool('aptosGetAccountResource', {
  address: z.string().describe('Aptos account address (with or without 0x prefix)'),
  resourceType: z.string().describe('Move struct resource type (e.g. "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>")'),
  ledgerVersion: z.string().optional().describe('Specific ledger version to query'),
}, handleToolCall((params) => alchemyApi.aptosGetAccountResource(params), 'aptosGetAccountResource'));

server.tool('aptosGetAccountModules', {
  address: z.string().describe('Aptos account address (with or without 0x prefix)'),
  ledgerVersion: z.string().optional().describe('Specific ledger version to query'),
}, handleToolCall((params) => alchemyApi.aptosGetAccountModules(params), 'aptosGetAccountModules'));

server.tool('aptosGetAccountModule', {
  address: z.string().describe('Aptos account address (with or without 0x prefix)'),
  moduleName: z.string().describe('Name of the module to retrieve'),
  ledgerVersion: z.string().optional().describe('Specific ledger version to query'),
}, handleToolCall((params) => alchemyApi.aptosGetAccountModule(params), 'aptosGetAccountModule'));

server.tool('aptosGetAccountTransactions', {
  address: z.string().describe('Aptos account address (with or without 0x prefix)'),
  limit: z.number().optional().describe('Maximum number of transactions to retrieve'),
  start: z.string().optional().describe('Account sequence number to start from'),
}, handleToolCall((params) => alchemyApi.aptosGetAccountTransactions(params), 'aptosGetAccountTransactions'));

server.tool('aptosGetEventsByCreationNumber', {
  address: z.string().describe('Aptos account address (hex-encoded)'),
  creationNumber: z.string().describe('Creation number corresponding to the event stream'),
  start: z.string().optional().describe('Sequence number to start retrieving events from'),
  limit: z.number().optional().describe('Maximum number of events to retrieve'),
}, handleToolCall((params) => alchemyApi.aptosGetEventsByCreationNumber(params), 'aptosGetEventsByCreationNumber'));

server.tool('aptosGetEventsByEventHandle', {
  address: z.string().describe('Aptos account address (hex-encoded)'),
  eventHandle: z.string().describe('Struct type name that contains the event handle'),
  fieldName: z.string().describe('Field name within the struct that holds the event handle'),
  start: z.string().optional().describe('Starting sequence number of events'),
  limit: z.number().optional().describe('Maximum number of events to return'),
}, handleToolCall((params) => alchemyApi.aptosGetEventsByEventHandle(params), 'aptosGetEventsByEventHandle'));

server.tool('aptosGetBlockByHeight', {
  blockHeight: z.number().describe('Block height (starts at 0)'),
  withTransactions: z.boolean().default(false).describe('Include all transactions in the block'),
}, handleToolCall((params) => alchemyApi.aptosGetBlockByHeight(params), 'aptosGetBlockByHeight'));

server.tool('aptosGetBlockByVersion', {
  version: z.number().describe('Ledger version to look up block information for'),
  withTransactions: z.boolean().default(false).describe('Include all transactions in the block'),
}, handleToolCall((params) => alchemyApi.aptosGetBlockByVersion(params), 'aptosGetBlockByVersion'));

server.tool('aptosGetTransactions', {
  start: z.string().optional().describe('Ledger version to start the list of transactions'),
  limit: z.number().optional().describe('Maximum number of transactions to retrieve'),
}, handleToolCall((params) => alchemyApi.aptosGetTransactions(params), 'aptosGetTransactions'));

server.tool('aptosGetTransactionByHash', {
  txnHash: z.string().describe('The transaction hash to retrieve'),
}, handleToolCall((params) => alchemyApi.aptosGetTransactionByHash(params), 'aptosGetTransactionByHash'));

server.tool('aptosEstimateGasPrice', {
}, handleToolCall(() => alchemyApi.aptosEstimateGasPrice(), 'aptosEstimateGasPrice'));

// ========================================
// NOTIFY (WEBHOOKS) API
// ========================================

server.tool('getWebhooks', {
}, handleToolCall(() => alchemyApi.getWebhooks(), 'getWebhooks'));

server.tool('getWebhookAddresses', {
  webhookId: z.string().describe('The ID of the address activity webhook'),
  limit: z.number().optional().describe('Maximum items per page (default: 100)'),
  after: z.string().optional().describe('Cursor for pagination'),
}, handleToolCall((params) => alchemyApi.getWebhookAddresses(params), 'getWebhookAddresses'));

server.tool('getWebhookNftFilters', {
  webhookId: z.string().describe('The ID of the webhook'),
  limit: z.number().optional().describe('Maximum items per page (default: 100)'),
  after: z.string().optional().describe('Cursor for pagination'),
}, handleToolCall((params) => alchemyApi.getWebhookNftFilters(params), 'getWebhookNftFilters'));

server.tool('getWebhookVariable', {
  variable: z.string().describe('The Custom Webhook variable name'),
  limit: z.number().optional().describe('Maximum items per page (default: 100)'),
  after: z.string().optional().describe('Cursor for pagination'),
}, handleToolCall((params) => alchemyApi.getWebhookVariable(params), 'getWebhookVariable'));

// ========================================
// ADMIN (GAS MANAGER) API
// ========================================

server.tool('getGasManagerPolicy', {
  id: z.string().describe('The ID of the gas manager policy'),
}, handleToolCall((params) => alchemyApi.getGasManagerPolicy(params), 'getGasManagerPolicy'));

server.tool('getGasManagerPolicies', {
  appId: z.string().optional().describe('Filter by app ID'),
  limit: z.number().optional().describe('Number of results per page (default: 10)'),
  before: z.string().optional().describe('Pagination cursor for previous page'),
  after: z.string().optional().describe('Pagination cursor for next page'),
}, handleToolCall((params) => alchemyApi.getGasManagerPolicies(params), 'getGasManagerPolicies'));

server.tool('getGasManagerPolicyStats', {
  id: z.string().describe('The ID of the gas manager policy'),
}, handleToolCall((params) => alchemyApi.getGasManagerPolicyStats(params), 'getGasManagerPolicyStats'));

server.tool('getGasManagerSponsorships', {
  id: z.string().describe('The ID of the gas manager policy'),
  limit: z.number().optional().describe('Number of sponsorships to return (default: 5)'),
}, handleToolCall((params) => alchemyApi.getGasManagerSponsorships(params), 'getGasManagerSponsorships'));

// ========================================
// SERVER STARTUP
// ========================================

async function runServer() {
  const transport = new StdioServerTransport();
  try {
    await server.connect(transport);
    console.error('Alchemy MCP Server is running on stdio');
  } catch (error) {
    console.error("Error during server connection:", error);
    if (error instanceof Error) {
      console.error("Detailed error message:", error.message);
    }
    console.error("Possible causes: network issues, incorrect configuration, or server not reachable.");
    console.error("Consider checking the server logs and configuration.");
    process.exit(1);
  }
}

runServer().catch((error) => {
  console.error("Fatal error in runServer():", error);
  process.exit(1);
});
