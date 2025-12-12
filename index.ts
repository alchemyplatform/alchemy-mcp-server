#!/usr/bin/env node

import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { z } from "zod";
import { alchemyApi } from './api/alchemyApi.js';
import { convertTimestampToDate } from './utils/convertTimestampToDate.js';
import { convertWeiToEth } from './utils/convertWeiToEth.js';
import { calculateDateRange, parseNaturalLanguageTimeFrame, toISO8601 } from './utils/dateUtils.js';
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

// Parse command line arguments
const args = process.argv.slice(2);
const mode = args[0] || 'stdio'; // Default to stdio mode if no argument provided

// Validate mode
if (mode !== 'stdio' && mode !== 'http') {
  console.error('Invalid mode. Please use "stdio" or "http".');
  process.exit(1);
}
const server = new McpServer({
  name: "alchemy-mcp-server",
  version: "0.1.0",
});

// || ** PRICES API ** ||
// Fetch the price of a token by it's symbol eg. "BTC" or "ETH"
server.registerTool('fetchTokenPriceBySymbol', {
  inputSchema: z.object({
    symbols: z.array(z.string()).describe('A list of blockchaintoken symbols to query. e.g. ["BTC", "ETH"]'),
  })
}, async (params: any) => {
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
server.registerTool('fetchTokenPriceByAddress', {
  inputSchema: z.object({
    addresses: z.array(z.object({
      address: z.string().describe('The token contract address to query. e.g. "0x1234567890123456789012345678901234567890"'),
      network: z.string().describe('The blockchain network to query. e.g. "eth-mainnet" or "base-mainnet"')
    })).describe('A list of token contract address and network pairs'),
  })
}, async (params: any) => {
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
server.registerTool('fetchTokenPriceHistoryBySymbol', {
  inputSchema: z.object({
    symbol: z.string().describe('The token symbol to query. e.g. "BTC" or "ETH"'),
    startTime: z.string().describe('The start time date to query. e.g. "2021-01-01"'),
    endTime: z.string().describe('The end time date to query. e.g. "2021-01-01"'),
    interval: z.string().describe('The interval to query. e.g. "1d" or "1h"')
  })
}, async (params: any) => {
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
server.registerTool('fetchTokenPriceHistoryByTimeFrame', {
  inputSchema: z.object({
    symbol: z.string().describe('The token symbol to query. e.g. "BTC" or "ETH"'),
    timeFrame: z.string().describe('Time frame like "last-week", "past-7d", "ytd", "last-month", etc. or use natural language like "last week"'),
    interval: z.string().default('1d').describe('The interval to query. e.g. "1d" or "1h"'),
    useNaturalLanguageProcessing: z.boolean().default(false).describe('If true, will interpret timeFrame as natural language'),
  })
}, async (params: any) => {
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

// || ** MultiChain Token API ** ||

// Fetch the current balance, price, and metadata of the tokens owned by specific addresses using network and address pairs.
// The returned response from the LLM should be formatted in an easy to read table format.
server.registerTool('fetchTokensOwnedByMultichainAddresses', {
  inputSchema: z.object({
    addresses: z.array(z.object({
      address: z.string().describe('The wallet address to query. e.g. "0x1234567890123456789012345678901234567890"'),
      networks: z.array(z.string()).describe('The blockchain networks to query. e.g. ["eth-mainnet", "base-mainnet"]')
    })).describe('A list of wallet address and network pairs'),
  })
}, async (params: any) => {
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

// || ** MultiChain Transaction History API ** ||

// Fetch the transaction history of singular or multiple wallet addresses using multiple blockchain networks.
// The returned response from the LLM should list out transactions with data and dates not just summarize them.
server.registerTool('fetchAddressTransactionHistory', {
  inputSchema: z.object({
    addresses: z.array(z.object({
      address: z.string().describe('The wallet address to query. e.g. "0x1234567890123456789012345678901234567890"'),
      networks: z.array(z.string()).describe('The blockchain networks to query. e.g. ["eth-mainnet", "base-mainnet"]')
    })).describe('A list of wallet address and network pairs'),
    before: z.string().optional().describe('The cursor that points to the previous set of results. Use this to paginate through the results.'),
    after: z.string().optional().describe('The cursor that points to the next set of results. Use this to paginate through the results.'),
    limit: z.number().default(25).optional().describe('The number of results to return. Default is 25. Max is 100')
  })
}, async (params: any) => {  
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

// || ** TRANSFERS API ** ||

// Fetch the transfers and transaction history for any address
server.registerTool('fetchTransfers', {
  inputSchema: z.object({
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
  })
}, async (params: any) => {
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

// || ** NFT API ** ||

// Fetch the NFTs owned by a singular or multiple wallet addresses across multiple blockchain networks.
server.registerTool('fetchNftsOwnedByMultichainAddresses', {
  inputSchema: z.object({
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
  })
}, async (params: any) => {
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
server.registerTool('fetchNftContractDataByMultichainAddress', {
  inputSchema: z.object({
    addresses: z.array(z.object({
      address: z.string().describe('The wallet address to query. e.g. "0x1234567890123456789012345678901234567890"'),
      networks: z.array(z.string()).default(['eth-mainnet']).describe('The blockchain networks to query. e.g. ["eth-mainnet", "base-mainnet"]'),
    })).describe('A list of wallet address and network pairs'),
    withMetadata: z.boolean().default(true).describe('Whether to include metadata in the results.'),
  })
}, async (params: any) => {
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

// Start the server based on the selected mode
if (mode === 'stdio') {
  // Start in stdio mode
  console.log('Starting Alchemy MCP Server in stdio mode...');
  const transport = new StdioServerTransport();
  server.connect(transport).then(() => {
    console.log('Alchemy MCP Server connected in stdio mode');
  }).catch(error => {
    console.error('Failed to start server in stdio mode:', error);
    process.exit(1);
  });
} else {
  // Start in http mode (existing implementation)
  console.log('Starting Alchemy MCP Server in http mode...');
  
  // Create an Express app for MCP
  const app = createMcpExpressApp();

  // Map to store transports by session ID
  const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  app.post('/mcp', async (req: Request, res: Response) => {
    console.log('Received MCP request:', req.body);
    try {
      // Check for existing session ID
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        // Reuse existing transport
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request - use JSON response mode
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true, // Enable JSON response mode
          onsessioninitialized: sessionId => {
            // Store the transport by session ID when session is initialized
            console.log(`Session initialized with ID: ${sessionId}`);
            transports[sessionId] = transport;
          }
        });

        // Connect the transport to the MCP server BEFORE handling the request
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return; // Already handled
      } else {
        // Invalid request - no session ID or not initialization request
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided'
          },
          id: null
        });
        return;
      }

      // Handle the request with existing transport - no need to reconnect
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error'
          },
          id: null
        });
      }
    }
  });

  // Handle GET requests for SSE streams according to spec
  app.get('/mcp', async (req: Request, res: Response) => {
    // Since this is a simple example, we don't support GET requests for this server
    // The spec requires returning 405 Method Not Allowed in this case
    res.status(405).set('Allow', 'POST').send('Method Not Allowed');
  });

  // Start the server
  const PORT = 3000;
  app.listen(PORT, error => {
    if (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
    console.log(`Alchemy MCP Server listening on port ${PORT}`);
  });
}