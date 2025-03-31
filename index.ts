import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Network, NftFilters } from "alchemy-sdk";
import { AlchemyMultichainClient } from "./alchemy-multichain.js";
import dotenv from 'dotenv';
import {z} from 'zod';

dotenv.config();

const defaultConfig = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.ETH_MAINNET,
}

const overrides = {
    [Network.ETH_SEPOLIA]: {apiKey: process.env.ALCHEMY_API_KEY},
    [Network.ARB_MAINNET]: {apiKey: process.env.ALCHEMY_API_KEY},
}

const alchemy = new AlchemyMultichainClient(defaultConfig, overrides);

const server = new McpServer({
    name: "alchemy-mpc-sdk",
    version: "1.0.0",
  });


  server.tool('getNFTsForOwner', {
    owner: z.string(),
    omitMetadata: z.boolean().default(true).optional(),
    pageKey: z.string().optional(),
    pageSize: z.number().default(10).optional(),
    contractAddresses: z.array(z.string()).optional(),
    excludeFilters: z.array(z.nativeEnum(NftFilters)).default([NftFilters.SPAM, NftFilters.AIRDROPS]),
    includeFilters: z.array(z.nativeEnum(NftFilters)).optional(),
    tokenUriTimeoutInMs: z.number().optional(),
    network: z.enum([Network.ETH_MAINNET, Network.ETH_SEPOLIA, Network.ARB_MAINNET]).optional().default(Network.ETH_MAINNET)
  }, async (params) => {
    try {
      const { owner, network, ...options } = params;
      const result = await alchemy.forNetwork(network).nft.getNftsForOwner(params.owner, options);
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