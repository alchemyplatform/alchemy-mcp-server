import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { alchemyApi } from './api/alchemyApi.js';
import toISO8601 from './utils/toISO8601.js';
// Create a new MCP server
const server = new McpServer({
  name: "alchemy-mpc",
  version: "1.0.0",
});
// PRICES API

// Get a token price by Symbol
server.tool('getTokenPriceBySymbol', {
  symbols: z.array(z.string()),
}, async (params) => {
  const result = await alchemyApi.getTokenPriceBySymbol(params);
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
});

// Get a token price by Address
server.tool('getTokenPriceByAddress', {
  addresses: z.array(z.object({
    address: z.string(),
    network: z.string()
  })),
}, async (params) => {
  const result = await alchemyApi.getTokenPriceByAddress(params);
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
});

// Get a token price history by Symbol
server.tool('getTokenPriceHistoryBySymbol', {
  symbol: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  interval: z.string()
}, async (params) => {
  const result = await alchemyApi.getTokenPriceHistoryBySymbol({
    ...params,
    startTime: toISO8601(params.startTime),
    endTime: toISO8601(params.endTime)
  });
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
});
  
// NFT API

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

// Create and connect transport
const transport = new StdioServerTransport();
await server.connect(transport); 