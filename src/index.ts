import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { alchemyApi } from './api/alchemyApi.js';

// Create a new MCP server
const server = new McpServer({
  name: "alchemy-mpc",
  version: "1.0.0",
});

// Define tools for Alchemy NFT Ownership endpoints

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
    console.log('Making request with params:', params);
    console.log('Environment:', {
      API_KEY: process.env.ALCHEMY_API_KEY,
      BASE_URL: process.env.ALCHEMY_BASE_URL,
      NODE_ENV: process.env.NODE_ENV
    });
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

// Get owners for a specific NFT
// server.tool('getOwnersForNFT', {
//   contractAddress: z.string(),
//   tokenId: z.string(),
//   pageKey: z.string().optional(),
//   pageSize: z.number().default(100).optional()
// }, async (params) => {
//   try {
//     const result = await alchemyApi.getOwnersForNFT(params);
//     return {
//       content: [
//         {
//           type: "text",
//           text: JSON.stringify(result, null, 2)
//         }
//       ]
//     };
//   } catch (error) {
//     if (error instanceof Error) {
//       return {
//         content: [{ type: "text", text: error.message }],
//         isError: true
//       };
//     }
//     return {
//       content: [{ type: "text", text: 'Unknown error occurred' }],
//       isError: true
//     };
//   }
// });

// // Get owners for a collection
// server.tool('getOwnersForCollection', {
//   contractAddress: z.string(),
//   withTokenBalances: z.boolean().default(false).optional(),
//   pageKey: z.string().optional(),
//   pageSize: z.number().default(100).optional()
// }, async (params) => {
//   try {
//     const result = await alchemyApi.getOwnersForCollection(params);
//     return {
//       content: [
//         {
//           type: "text",
//           text: JSON.stringify(result, null, 2)
//         }
//       ]
//     };
//   } catch (error) {
//     if (error instanceof Error) {
//       return {
//         content: [{ type: "text", text: error.message }],
//         isError: true
//       };
//     }
//     return {
//       content: [{ type: "text", text: 'Unknown error occurred' }],
//       isError: true
//     };
//   }
// });

// // Check if an address owns an NFT from a collection
// server.tool('isHolderOfCollection', {
//   wallet: z.string(),
//   contractAddress: z.string()
// }, async (params) => {
//   try {
//     const result = await alchemyApi.isHolderOfCollection(params);
//     return {
//       content: [
//         {
//           type: "text",
//           text: JSON.stringify(result, null, 2)
//         }
//       ]
//     };
//   } catch (error) {
//     if (error instanceof Error) {
//       return {
//         content: [{ type: "text", text: error.message }],
//         isError: true
//       };
//     }
//     return {
//       content: [{ type: "text", text: 'Unknown error occurred' }],
//       isError: true
//     };
//   }
// });

// Create and connect transport
const transport = new StdioServerTransport();
await server.connect(transport); 