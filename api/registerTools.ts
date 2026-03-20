import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { convertTimestampToDate } from "../utils/convertTimestampToDate.js";
import {
  calculateDateRange,
  parseNaturalLanguageTimeFrame,
  toISO8601,
} from "../utils/dateUtils.js";
import { convertWeiToEth } from "../utils/ethConversions.js";
import { AlchemyApi } from "./alchemyApi.js";
import { SUPPORTED_NETWORKS } from "./networks.js";

// Shared descriptions for network params — keeps tool schemas consistent
const NETWORK_DESC =
  'Network ID. Call listSupportedNetworks for all options. e.g. "eth-mainnet", "base-mainnet"';
const NETWORKS_DESC =
  'Network IDs. Call listSupportedNetworks for all options. e.g. ["eth-mainnet", "base-mainnet"]';
const SOLANA_NETWORK_DESC =
  'Network ID. Call listSupportedNetworks for all options. e.g. "solana-mainnet"';

// Standard tool handler to reduce boilerplate for tools that just call an API method and return JSON
const handleToolCall =
  (fn: (params: any) => Promise<any>, name: string) => async (params: any) => {
    try {
      const result = await fn(params);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
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
        content: [{ type: "text" as const, text: "Unknown error occurred" }],
        isError: true,
      };
    }
  };

export function registerTools(server: McpServer, alchemyApi: AlchemyApi) {
  // ========================================
  // NETWORK DISCOVERY
  // ========================================

  server.tool("listSupportedNetworks", {}, () => ({
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(SUPPORTED_NETWORKS, null, 2),
      },
    ],
  }));

  // ========================================
  // PRICES API
  // ========================================

  server.tool(
    "fetchTokenPriceBySymbol",
    {
      symbols: z
        .array(z.string())
        .describe(
          'A list of blockchaintoken symbols to query. e.g. ["BTC", "ETH"]',
        ),
    },
    handleToolCall(
      (params) => alchemyApi.getTokenPriceBySymbol(params),
      "fetchTokenPriceBySymbol",
    ),
  );

  server.tool(
    "fetchTokenPriceByAddress",
    {
      addresses: z
        .array(
          z.object({
            address: z
              .string()
              .describe(
                'The token contract address to query. e.g. "0x1234567890123456789012345678901234567890"',
              ),
            network: z.string().describe(NETWORK_DESC),
          }),
        )
        .describe("A list of token contract address and network pairs"),
    },
    handleToolCall(
      (params) => alchemyApi.getTokenPriceByAddress(params),
      "fetchTokenPriceByAddress",
    ),
  );

  server.tool(
    "fetchTokenPriceHistoryBySymbol",
    {
      symbol: z
        .string()
        .describe('The token symbol to query. e.g. "BTC" or "ETH"'),
      startTime: z
        .string()
        .describe('The start time date to query. e.g. "2021-01-01"'),
      endTime: z
        .string()
        .describe('The end time date to query. e.g. "2021-01-01"'),
      interval: z.string().describe('The interval to query. e.g. "1d" or "1h"'),
    },
    handleToolCall(
      (params) =>
        alchemyApi.getTokenPriceHistoryBySymbol({
          ...params,
          startTime: toISO8601(params.startTime),
          endTime: toISO8601(params.endTime),
        }),
      "fetchTokenPriceHistoryBySymbol",
    ),
  );

  server.tool(
    "fetchTokenPriceHistoryByTimeFrame",
    {
      symbol: z
        .string()
        .describe('The token symbol to query. e.g. "BTC" or "ETH"'),
      timeFrame: z
        .string()
        .describe(
          'Time frame like "last-week", "past-7d", "ytd", "last-month", etc. or use natural language like "last week"',
        ),
      interval: z
        .string()
        .default("1d")
        .describe('The interval to query. e.g. "1d" or "1h"'),
      useNaturalLanguageProcessing: z
        .boolean()
        .default(false)
        .describe("If true, will interpret timeFrame as natural language"),
    },
    handleToolCall((params) => {
      let timeFrame = params.timeFrame;
      if (params.useNaturalLanguageProcessing) {
        timeFrame = parseNaturalLanguageTimeFrame(params.timeFrame);
      }
      const { startDate, endDate } = calculateDateRange(timeFrame);
      return alchemyApi.getTokenPriceHistoryBySymbol({
        symbol: params.symbol,
        startTime: startDate,
        endTime: endDate,
        interval: params.interval,
      });
    }, "fetchTokenPriceHistoryByTimeFrame"),
  );

  // ========================================
  // MultiChain Token API
  // ========================================

  server.tool(
    "fetchTokensOwnedByMultichainAddresses",
    {
      addresses: z
        .array(
          z.object({
            address: z
              .string()
              .describe(
                'The wallet address to query. e.g. "0x1234567890123456789012345678901234567890"',
              ),
            networks: z.array(z.string()).describe(NETWORKS_DESC),
          }),
        )
        .describe("A list of wallet address and network pairs"),
    },
    handleToolCall(
      (params) => alchemyApi.getTokensByMultichainAddress(params),
      "fetchTokensOwnedByMultichainAddresses",
    ),
  );

  // ========================================
  // MultiChain Transaction History API
  // ========================================

  server.tool(
    "fetchAddressTransactionHistory",
    {
      addresses: z
        .array(
          z.object({
            address: z
              .string()
              .describe(
                'The wallet address to query. e.g. "0x1234567890123456789012345678901234567890"',
              ),
            networks: z.array(z.string()).describe(NETWORKS_DESC),
          }),
        )
        .describe("A list of wallet address and network pairs"),
      before: z
        .string()
        .optional()
        .describe(
          "The cursor that points to the previous set of results. Use this to paginate through the results.",
        ),
      after: z
        .string()
        .optional()
        .describe(
          "The cursor that points to the next set of results. Use this to paginate through the results.",
        ),
      limit: z
        .number()
        .default(25)
        .optional()
        .describe("The number of results to return. Default is 25. Max is 100"),
    },
    handleToolCall(async (params) => {
      const result =
        await alchemyApi.getTransactionHistoryByMultichainAddress(params);
      result.transactions = result.transactions.map((transaction: any) => ({
        ...transaction,
        date: convertTimestampToDate(transaction.blockTimestamp),
        ethValue: convertWeiToEth(transaction.value),
      }));
      return result;
    }, "fetchAddressTransactionHistory"),
  );

  // ========================================
  // TRANSFERS API
  // ========================================

  server.tool(
    "fetchTransfers",
    {
      fromBlock: z
        .string()
        .default("0x0")
        .describe(
          'The block number to start the search from. e.g. "1234567890". Inclusive from block (hex string, int, latest, or indexed).',
        ),
      toBlock: z
        .string()
        .default("latest")
        .describe(
          'The block number to end the search at. e.g. "1234567890". Inclusive to block (hex string, int, latest, or indexed).',
        ),
      fromAddress: z
        .string()
        .optional()
        .describe("The wallet address to query the transfer was sent from."),
      toAddress: z
        .string()
        .optional()
        .describe("The wallet address to query the transfer was sent to."),
      contractAddresses: z
        .array(z.string())
        .default([])
        .describe(
          'The contract addresses to query. e.g. ["0x1234567890123456789012345678901234567890"]',
        ),
      category: z
        .array(z.string())
        .default(["external", "erc20"])
        .describe(
          'The category of transfers to query. e.g. "external" or "internal"',
        ),
      order: z
        .string()
        .default("asc")
        .describe('The order of the results. e.g. "asc" or "desc".'),
      withMetadata: z
        .boolean()
        .default(false)
        .describe("Whether to include metadata in the results."),
      excludeZeroValue: z
        .boolean()
        .default(true)
        .describe("Whether to exclude zero value transfers."),
      maxCount: z
        .string()
        .default("0xA")
        .describe('The maximum number of results to return. e.g. "0x3E8".'),
      pageKey: z
        .string()
        .optional()
        .describe(
          "The cursor to start the search from. Use this to paginate through the results.",
        ),
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
    },
    handleToolCall(
      (params) => alchemyApi.getAssetTransfers(params),
      "fetchTransfers",
    ),
  );

  // ========================================
  // NFT API (multichain)
  // ========================================

  server.tool(
    "fetchNftsOwnedByMultichainAddresses",
    {
      addresses: z
        .array(
          z.object({
            address: z
              .string()
              .describe(
                'The wallet address to query. e.g. "0x1234567890123456789012345678901234567890"',
              ),
            networks: z
              .array(z.string())
              .default(["eth-mainnet"])
              .describe(NETWORKS_DESC),
            excludeFilters: z
              .array(z.enum(["SPAM", "AIRDROPS"]))
              .default(["SPAM", "AIRDROPS"])
              .describe(
                'The filters to exclude from the results. e.g. ["SPAM", "AIRDROPS"]',
              ),
            includeFilters: z
              .array(z.enum(["SPAM", "AIRDROPS"]))
              .default([])
              .describe(
                'The filters to include in the results. e.g. ["SPAM", "AIRDROPS"]',
              ),
            spamConfidenceLevel: z
              .enum(["LOW", "MEDIUM", "HIGH", "VERY_HIGH"])
              .default("VERY_HIGH")
              .describe(
                'The spam confidence level to query. e.g. "LOW" or "HIGH"',
              ),
          }),
        )
        .describe("A list of wallet address and network pairs"),
      withMetadata: z
        .boolean()
        .default(true)
        .describe("Whether to include metadata in the results."),
      pageKey: z
        .string()
        .optional()
        .describe(
          "The cursor to start the search from. Use this to paginate through the results.",
        ),
      pageSize: z
        .number()
        .default(10)
        .describe(
          "The number of results to return. Default is 100. Max is 100",
        ),
    },
    handleToolCall(
      (params) => alchemyApi.getNftsForAddress(params),
      "fetchNftsOwnedByMultichainAddresses",
    ),
  );

  server.tool(
    "fetchNftContractDataByMultichainAddress",
    {
      addresses: z
        .array(
          z.object({
            address: z
              .string()
              .describe(
                'The wallet address to query. e.g. "0x1234567890123456789012345678901234567890"',
              ),
            networks: z
              .array(z.string())
              .default(["eth-mainnet"])
              .describe(NETWORKS_DESC),
          }),
        )
        .describe("A list of wallet address and network pairs"),
      withMetadata: z
        .boolean()
        .default(true)
        .describe("Whether to include metadata in the results."),
    },
    handleToolCall(
      (params) => alchemyApi.getNftContractsByAddress(params),
      "fetchNftContractDataByMultichainAddress",
    ),
  );

  // ========================================
  // WALLET API
  // ========================================

  server.tool(
    "sendTransaction",
    {
      ownerScaAccountAddress: z
        .string()
        .describe("The owner SCA account address."),
      signerAddress: z
        .string()
        .describe("The signer address to send the transaction from."),
      toAddress: z.string().describe("The address to send the transaction to."),
      value: z
        .string()
        .optional()
        .describe("The value of the transaction in ETH."),
      callData: z.string().optional().describe("The data of the transaction."),
    },
    handleToolCall(
      (params) => alchemyApi.sendTransaction(params),
      "sendTransaction",
    ),
  );

  // ========================================
  // SWAP API
  // ========================================

  server.tool(
    "swap",
    {
      ownerScaAccountAddress: z
        .string()
        .describe("The owner SCA account address."),
      signerAddress: z
        .string()
        .describe("The signer address to send the transaction from."),
    },
    handleToolCall((params) => alchemyApi.swap(params), "swap"),
  );

  // ========================================
  // NFT V3 API (single-chain GET endpoints)
  // ========================================

  server.tool(
    "getNFTsForOwner",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      owner: z
        .string()
        .describe(
          "Address for NFT owner (can be in ENS format for Eth Mainnet).",
        ),
      contractAddresses: z
        .array(z.string())
        .optional()
        .describe(
          "Array of contract addresses to filter the responses with. Max limit 45.",
        ),
      withMetadata: z
        .boolean()
        .default(true)
        .describe("If true, returns NFT metadata. Defaults to true."),
      orderBy: z
        .string()
        .optional()
        .describe("Order for the results. Can be 'transferTime'."),
      excludeFilters: z
        .array(z.enum(["SPAM", "AIRDROPS"]))
        .optional()
        .describe('Filters to exclude. e.g. ["SPAM", "AIRDROPS"]'),
      includeFilters: z
        .array(z.enum(["SPAM", "AIRDROPS"]))
        .optional()
        .describe('Filters to include. e.g. ["SPAM", "AIRDROPS"]'),
      spamConfidenceLevel: z
        .enum(["LOW", "MEDIUM", "HIGH", "VERY_HIGH"])
        .optional()
        .describe("The spam confidence level to filter at."),
      tokenUriTimeoutInMs: z
        .number()
        .optional()
        .describe(
          "Timeout in ms for metadata URI resolution. Set to 0 for cache-only.",
        ),
      pageKey: z
        .string()
        .optional()
        .describe("Pagination key from a previous response."),
      pageSize: z
        .number()
        .optional()
        .describe("Number of NFTs to return per page. Max 100."),
    },
    handleToolCall(
      (params) => alchemyApi.getNFTsForOwner(params),
      "getNFTsForOwner",
    ),
  );

  server.tool(
    "getNFTsForContract",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z
        .string()
        .describe("Contract address for the NFT collection."),
      withMetadata: z
        .boolean()
        .default(true)
        .describe("If true, returns NFT metadata."),
      startToken: z
        .string()
        .optional()
        .describe("Token ID offset for pagination."),
      limit: z
        .number()
        .optional()
        .describe("Number of NFTs to return. Defaults to 100."),
      tokenUriTimeoutInMs: z
        .number()
        .optional()
        .describe("Timeout in ms for metadata URI resolution."),
    },
    handleToolCall(
      (params) => alchemyApi.getNFTsForContract(params),
      "getNFTsForContract",
    ),
  );

  server.tool(
    "getNFTsForCollection",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z
        .string()
        .optional()
        .describe("Contract address for the NFT collection."),
      collectionSlug: z
        .string()
        .optional()
        .describe("OpenSea slug for the NFT collection."),
      withMetadata: z
        .boolean()
        .default(true)
        .describe("If true, returns NFT metadata."),
      startToken: z
        .string()
        .optional()
        .describe("Token ID offset for pagination."),
      limit: z
        .number()
        .optional()
        .describe("Number of NFTs to return. Defaults to 100."),
      tokenUriTimeoutInMs: z
        .number()
        .optional()
        .describe("Timeout in ms for metadata URI resolution."),
    },
    handleToolCall(
      (params) => alchemyApi.getNFTsForCollection(params),
      "getNFTsForCollection",
    ),
  );

  server.tool(
    "getNFTMetadata",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z.string().describe("Contract address of the NFT."),
      tokenId: z
        .string()
        .describe("The ID of the token. Can be in hex or decimal format."),
      tokenType: z
        .string()
        .optional()
        .describe("'ERC721' or 'ERC1155'. Specifies type of token."),
      tokenUriTimeoutInMs: z
        .number()
        .optional()
        .describe("Timeout in ms for metadata URI resolution."),
      refreshCache: z
        .boolean()
        .optional()
        .describe("If true, refreshes the cached metadata."),
    },
    handleToolCall(
      (params) => alchemyApi.getNFTMetadata(params),
      "getNFTMetadata",
    ),
  );

  server.tool(
    "getContractMetadata",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z
        .string()
        .describe("Contract address for the NFT contract."),
    },
    handleToolCall(
      (params) => alchemyApi.getContractMetadata(params),
      "getContractMetadata",
    ),
  );

  server.tool(
    "getCollectionMetadata",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      collectionSlug: z
        .string()
        .describe("OpenSea slug for the NFT collection."),
    },
    handleToolCall(
      (params) => alchemyApi.getCollectionMetadata(params),
      "getCollectionMetadata",
    ),
  );

  server.tool(
    "invalidateNFTContractCache",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z
        .string()
        .describe("Contract address to invalidate cached metadata for."),
    },
    handleToolCall(
      (params) => alchemyApi.invalidateContract(params),
      "invalidateNFTContractCache",
    ),
  );

  server.tool(
    "getOwnersForNFT",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z.string().describe("Contract address for the NFT."),
      tokenId: z.string().describe("The token ID to get owners for."),
    },
    handleToolCall(
      (params) => alchemyApi.getOwnersForNFT(params),
      "getOwnersForNFT",
    ),
  );

  server.tool(
    "getOwnersForContract",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z
        .string()
        .describe("Contract address for the NFT contract."),
      withTokenBalances: z
        .boolean()
        .optional()
        .describe("If true, returns token balances for each owner."),
      pageKey: z
        .string()
        .optional()
        .describe("Pagination key for contracts with >50,000 owners."),
    },
    handleToolCall(
      (params) => alchemyApi.getOwnersForContract(params),
      "getOwnersForContract",
    ),
  );

  server.tool(
    "getSpamContracts",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
    },
    handleToolCall(
      (params) => alchemyApi.getSpamContracts(params),
      "getSpamContracts",
    ),
  );

  server.tool(
    "isSpamContract",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z
        .string()
        .describe("Contract address to check for spam status."),
    },
    handleToolCall(
      (params) => alchemyApi.isSpamContract(params),
      "isSpamContract",
    ),
  );

  server.tool(
    "isAirdropNFT",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z.string().describe("Contract address of the NFT."),
      tokenId: z.string().describe("The token ID to check."),
    },
    handleToolCall((params) => alchemyApi.isAirdropNFT(params), "isAirdropNFT"),
  );

  server.tool(
    "summarizeNFTAttributes",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z
        .string()
        .describe("Contract address of the NFT collection."),
    },
    handleToolCall(
      (params) => alchemyApi.summarizeNFTAttributes(params),
      "summarizeNFTAttributes",
    ),
  );

  server.tool(
    "getFloorPrice",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z
        .string()
        .optional()
        .describe("Contract address for the NFT collection."),
      collectionSlug: z
        .string()
        .optional()
        .describe("OpenSea slug for the NFT collection."),
    },
    handleToolCall(
      (params) => alchemyApi.getFloorPrice(params),
      "getFloorPrice",
    ),
  );

  server.tool(
    "searchContractMetadata",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      query: z
        .string()
        .describe("Search keyword to match against NFT contract metadata."),
    },
    handleToolCall(
      (params) => alchemyApi.searchContractMetadata(params),
      "searchContractMetadata",
    ),
  );

  server.tool(
    "isHolderOfContract",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      wallet: z
        .string()
        .describe("Wallet address to check for contract ownership."),
      contractAddress: z
        .string()
        .describe("Contract address for the NFT contract."),
    },
    handleToolCall(
      (params) => alchemyApi.isHolderOfContract(params),
      "isHolderOfContract",
    ),
  );

  server.tool(
    "computeRarity",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z
        .string()
        .describe("Contract address of the NFT collection."),
      tokenId: z
        .string()
        .describe("Token ID of the NFT to compute rarity for."),
    },
    handleToolCall(
      (params) => alchemyApi.computeRarity(params),
      "computeRarity",
    ),
  );

  server.tool(
    "getNFTSales",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      fromBlock: z
        .string()
        .optional()
        .describe('Starting block number. Hex, decimal, or "latest".'),
      toBlock: z
        .string()
        .optional()
        .describe('Ending block number. Hex, decimal, or "latest".'),
      order: z.string().optional().describe('Sort order: "asc" or "desc".'),
      marketplace: z
        .string()
        .optional()
        .describe(
          'Marketplace to filter by. e.g. "seaport", "looksrare", "x2y2", "blur", "cryptopunks"',
        ),
      contractAddress: z
        .string()
        .optional()
        .describe("Contract address of an NFT collection to filter by."),
      tokenId: z
        .string()
        .optional()
        .describe("Token ID within the contract to filter by."),
      buyerAddress: z
        .string()
        .optional()
        .describe("Address of the buyer to filter by."),
      sellerAddress: z
        .string()
        .optional()
        .describe("Address of the seller to filter by."),
      taker: z
        .string()
        .optional()
        .describe('"BUYER" or "SELLER" - the price taker in the trade.'),
      limit: z
        .number()
        .optional()
        .describe("Max number of sales to return. Max and default 1000."),
      pageKey: z
        .string()
        .optional()
        .describe("Pagination key from a previous response."),
    },
    handleToolCall((params) => alchemyApi.getNFTSales(params), "getNFTSales"),
  );

  server.tool(
    "getContractsForOwner",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      owner: z.string().describe("Owner address to get NFT contracts for."),
      pageKey: z
        .string()
        .optional()
        .describe("Pagination key from a previous response."),
      pageSize: z
        .number()
        .optional()
        .describe("Number of contracts to return. Max 100."),
      withMetadata: z
        .boolean()
        .optional()
        .describe("If true, returns contract metadata."),
      includeFilters: z
        .array(z.enum(["SPAM", "AIRDROPS"]))
        .optional()
        .describe("Filters to include."),
      excludeFilters: z
        .array(z.enum(["SPAM", "AIRDROPS"]))
        .optional()
        .describe("Filters to exclude."),
      orderBy: z.string().optional().describe("Order for the results."),
      spamConfidenceLevel: z
        .enum(["LOW", "MEDIUM", "HIGH", "VERY_HIGH"])
        .optional()
        .describe("Spam confidence level to filter at."),
    },
    handleToolCall(
      (params) => alchemyApi.getContractsForOwner(params),
      "getContractsForOwner",
    ),
  );

  server.tool(
    "getCollectionsForOwner",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      owner: z.string().describe("Owner address to get NFT collections for."),
      pageKey: z
        .string()
        .optional()
        .describe("Pagination key from a previous response."),
      pageSize: z
        .number()
        .optional()
        .describe("Number of collections to return. Max 100."),
      withMetadata: z
        .boolean()
        .optional()
        .describe("If true, returns collection metadata."),
      includeFilters: z
        .array(z.enum(["SPAM", "AIRDROPS"]))
        .optional()
        .describe("Filters to include."),
      excludeFilters: z
        .array(z.enum(["SPAM", "AIRDROPS"]))
        .optional()
        .describe("Filters to exclude."),
    },
    handleToolCall(
      (params) => alchemyApi.getCollectionsForOwner(params),
      "getCollectionsForOwner",
    ),
  );

  server.tool(
    "reportSpam",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      address: z.string().describe("The address to report as spam."),
      isSpam: z.boolean().describe("Whether the address is spam."),
    },
    handleToolCall((params) => alchemyApi.reportSpam(params), "reportSpam"),
  );

  // ========================================
  // Token API (JSON-RPC)
  // ========================================

  server.tool(
    "getTokenAllowance",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contract: z.string().describe("The token contract address."),
      owner: z.string().describe("The address of the token owner."),
      spender: z.string().describe("The address of the spender."),
    },
    handleToolCall(
      (params) => alchemyApi.getTokenAllowance(params),
      "getTokenAllowance",
    ),
  );

  server.tool(
    "getTokenBalances",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      address: z
        .string()
        .describe("The wallet address to get token balances for."),
      tokenSpec: z
        .union([
          z.enum(["erc20", "DEFAULT_TOKENS", "NATIVE_TOKEN"]),
          z.array(z.string()),
        ])
        .optional()
        .describe(
          'Token specification: "erc20", "NATIVE_TOKEN", or an array of contract addresses.',
        ),
      pageKey: z
        .string()
        .optional()
        .describe("Pagination key for fetching more results."),
      maxCount: z
        .number()
        .optional()
        .describe("Max number of token balances to return. Capped at 100."),
    },
    handleToolCall(
      (params) => alchemyApi.getTokenBalances(params),
      "getTokenBalances",
    ),
  );

  server.tool(
    "getTokenMetadata",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z
        .string()
        .describe("The token contract address to get metadata for."),
    },
    handleToolCall(
      (params) => alchemyApi.getTokenMetadata(params),
      "getTokenMetadata",
    ),
  );

  // ========================================
  // Transaction Receipt API (JSON-RPC)
  // ========================================

  server.tool(
    "getTransactionReceipts",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockNumber: z
        .string()
        .optional()
        .describe(
          "Block number in hex. One of blockNumber or blockHash must be provided.",
        ),
      blockHash: z
        .string()
        .optional()
        .describe(
          "Block hash in hex. One of blockNumber or blockHash must be provided.",
        ),
    },
    handleToolCall(
      (params) => alchemyApi.getTransactionReceipts(params),
      "getTransactionReceipts",
    ),
  );

  // ========================================
  // DEBUG API
  // ========================================

  server.tool(
    "debugGetRawBlock",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockNumberOrTag: z
        .string()
        .describe("Block number in hex or tag like 'latest'"),
    },
    handleToolCall(
      (params) => alchemyApi.debugGetRawBlock(params),
      "debugGetRawBlock",
    ),
  );

  server.tool(
    "debugGetRawHeader",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockNumberOrTag: z
        .string()
        .describe("Block number in hex or tag like 'latest'"),
    },
    handleToolCall(
      (params) => alchemyApi.debugGetRawHeader(params),
      "debugGetRawHeader",
    ),
  );

  server.tool(
    "debugGetRawReceipts",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockNumberOrTag: z
        .string()
        .describe("Block number in hex or tag like 'latest'"),
    },
    handleToolCall(
      (params) => alchemyApi.debugGetRawReceipts(params),
      "debugGetRawReceipts",
    ),
  );

  server.tool(
    "debugTraceBlockByHash",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockHash: z.string().describe("32-byte block hash"),
      tracer: z.object({}).passthrough().optional().describe("Tracer options"),
    },
    handleToolCall(
      (params) => alchemyApi.debugTraceBlockByHash(params),
      "debugTraceBlockByHash",
    ),
  );

  server.tool(
    "debugTraceBlockByNumber",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockNumberOrTag: z
        .string()
        .describe("Block number in hex or tag like 'latest'"),
      tracer: z.object({}).passthrough().optional().describe("Tracer options"),
    },
    handleToolCall(
      (params) => alchemyApi.debugTraceBlockByNumber(params),
      "debugTraceBlockByNumber",
    ),
  );

  server.tool(
    "debugTraceCall",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      transaction: z
        .object({})
        .passthrough()
        .describe("Transaction call object with from, to, gas, value, data"),
      blockIdentifier: z.string().describe("Block hash, number, or tag"),
      options: z
        .object({})
        .passthrough()
        .optional()
        .describe("Tracer and state override options"),
    },
    handleToolCall(
      (params) => alchemyApi.debugTraceCall(params),
      "debugTraceCall",
    ),
  );

  server.tool(
    "debugTraceTransaction",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      transactionHash: z.string().describe("Transaction hash"),
      options: z
        .object({})
        .passthrough()
        .optional()
        .describe("Options including tracer type and config"),
    },
    handleToolCall(
      (params) => alchemyApi.debugTraceTransaction(params),
      "debugTraceTransaction",
    ),
  );

  // ========================================
  // TRACE API
  // ========================================

  server.tool(
    "traceBlock",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockIdentifier: z
        .string()
        .default("latest")
        .describe("Block identifier (number, hash, or tag)"),
    },
    handleToolCall((params) => alchemyApi.traceBlock(params), "traceBlock"),
  );

  server.tool(
    "traceCall",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      transaction: z
        .object({})
        .passthrough()
        .describe("Transaction call object"),
      traceTypes: z
        .array(z.string())
        .describe('Array of trace types. e.g. ["trace", "stateDiff"]'),
      blockIdentifier: z
        .string()
        .optional()
        .describe("Block identifier (number, hash, or tag)"),
    },
    handleToolCall((params) => alchemyApi.traceCall(params), "traceCall"),
  );

  server.tool(
    "traceGet",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      transactionHash: z.string().describe("Transaction hash"),
      traceIndexes: z.array(z.string()).describe("Hex index positions"),
    },
    handleToolCall((params) => alchemyApi.traceGet(params), "traceGet"),
  );

  server.tool(
    "traceRawTransaction",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      rawTransaction: z.string().describe("Raw transaction data"),
      traceTypes: z
        .array(z.string())
        .describe('Array of trace types. e.g. ["trace", "stateDiff"]'),
    },
    handleToolCall(
      (params) => alchemyApi.traceRawTransaction(params),
      "traceRawTransaction",
    ),
  );

  server.tool(
    "traceReplayBlockTransactions",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockIdentifier: z
        .string()
        .describe("Block identifier (number, hash, or tag)"),
      traceTypes: z
        .array(z.string())
        .describe('Array of trace types. e.g. ["trace", "stateDiff"]'),
    },
    handleToolCall(
      (params) => alchemyApi.traceReplayBlockTransactions(params),
      "traceReplayBlockTransactions",
    ),
  );

  server.tool(
    "traceReplayTransaction",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      transactionHash: z.string().describe("Transaction hash"),
      traceTypes: z
        .array(z.string())
        .describe('Array of trace types. e.g. ["trace", "stateDiff"]'),
    },
    handleToolCall(
      (params) => alchemyApi.traceReplayTransaction(params),
      "traceReplayTransaction",
    ),
  );

  server.tool(
    "traceTransaction",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      transactionHash: z.string().describe("Transaction hash"),
    },
    handleToolCall(
      (params) => alchemyApi.traceTransaction(params),
      "traceTransaction",
    ),
  );

  server.tool(
    "traceFilter",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      fromBlock: z
        .string()
        .optional()
        .describe("Starting block (hex, decimal, or tag)"),
      toBlock: z
        .string()
        .optional()
        .describe("Ending block (hex, decimal, or tag)"),
      fromAddress: z
        .array(z.string())
        .optional()
        .describe("Filter by sender addresses"),
      toAddress: z
        .array(z.string())
        .optional()
        .describe("Filter by recipient addresses"),
      after: z.string().optional().describe("Offset trace number"),
      count: z.number().optional().describe("Number of traces to return"),
    },
    handleToolCall((params) => alchemyApi.traceFilter(params), "traceFilter"),
  );

  // ========================================
  // TRANSACTION SIMULATION API
  // ========================================

  server.tool(
    "simulateAssetChanges",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      transaction: z
        .object({
          to: z.string().describe("The recipient address"),
          from: z.string().optional().describe("The sender address"),
          value: z.string().optional().describe("The value in wei"),
          data: z.string().optional().describe("The transaction data"),
          gas: z.string().optional().describe("The gas limit"),
        })
        .describe("Transaction object to simulate"),
    },
    handleToolCall(
      (params) => alchemyApi.simulateAssetChanges(params),
      "simulateAssetChanges",
    ),
  );

  server.tool(
    "simulateAssetChangesBundle",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      transactions: z
        .array(
          z.object({
            to: z.string().describe("The recipient address"),
            from: z.string().optional().describe("The sender address"),
            value: z.string().optional().describe("The value in wei"),
            data: z.string().optional().describe("The transaction data"),
            gas: z.string().optional().describe("The gas limit"),
          }),
        )
        .min(1)
        .max(2)
        .describe("Array of transaction objects to simulate (1-2 items)"),
    },
    handleToolCall(
      (params) => alchemyApi.simulateAssetChangesBundle(params),
      "simulateAssetChangesBundle",
    ),
  );

  server.tool(
    "simulateExecution",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      transaction: z
        .object({
          to: z.string().describe("The recipient address"),
          from: z.string().optional().describe("The sender address"),
          value: z.string().optional().describe("The value in wei"),
          data: z.string().optional().describe("The transaction data"),
          gas: z.string().optional().describe("The gas limit"),
        })
        .describe("Transaction object to simulate"),
    },
    handleToolCall(
      (params) => alchemyApi.simulateExecution(params),
      "simulateExecution",
    ),
  );

  server.tool(
    "simulateExecutionBundle",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      transactions: z
        .array(
          z.object({
            to: z.string().describe("The recipient address"),
            from: z.string().optional().describe("The sender address"),
            value: z.string().optional().describe("The value in wei"),
            data: z.string().optional().describe("The transaction data"),
            gas: z.string().optional().describe("The gas limit"),
          }),
        )
        .min(1)
        .max(2)
        .describe("Array of transaction objects to simulate (1-2 items)"),
    },
    handleToolCall(
      (params) => alchemyApi.simulateExecutionBundle(params),
      "simulateExecutionBundle",
    ),
  );

  // ========================================
  // BUNDLER API
  // ========================================

  server.tool(
    "getMaxPriorityFeePerGas",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
    },
    handleToolCall(
      (params) => alchemyApi.getMaxPriorityFeePerGas(params),
      "getMaxPriorityFeePerGas",
    ),
  );

  server.tool(
    "getUserOperationReceipt",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      userOpHash: z.string().describe("The user operation hash"),
    },
    handleToolCall(
      (params) => alchemyApi.getUserOperationReceipt(params),
      "getUserOperationReceipt",
    ),
  );

  server.tool(
    "getSupportedEntryPoints",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
    },
    handleToolCall(
      (params) => alchemyApi.getSupportedEntryPoints(params),
      "getSupportedEntryPoints",
    ),
  );

  server.tool(
    "getUserOperationByHash",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      userOpHash: z.string().describe("The user operation hash"),
    },
    handleToolCall(
      (params) => alchemyApi.getUserOperationByHash(params),
      "getUserOperationByHash",
    ),
  );

  server.tool(
    "estimateUserOperationGas",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      userOperation: z
        .object({})
        .passthrough()
        .describe("UserOperation object"),
      entryPoint: z.string().describe("EntryPoint address"),
      stateOverrideSet: z
        .object({})
        .passthrough()
        .optional()
        .describe("State override set for gas estimation"),
    },
    handleToolCall(
      (params) => alchemyApi.estimateUserOperationGas(params),
      "estimateUserOperationGas",
    ),
  );

  // ========================================
  // USER OPERATION SIMULATION API
  // ========================================

  server.tool(
    "simulateUserOperationAssetChanges",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      userOperation: z
        .object({})
        .passthrough()
        .describe("UserOperation object"),
      entryPoint: z.string().describe("EntryPoint address"),
      blockNumber: z
        .string()
        .optional()
        .describe("Block number for simulation context"),
    },
    handleToolCall(
      (params) => alchemyApi.simulateUserOperationAssetChanges(params),
      "simulateUserOperationAssetChanges",
    ),
  );

  // ========================================
  // BEACON API
  // ========================================

  server.tool(
    "getBeaconGenesis",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconGenesis(params),
      "getBeaconGenesis",
    ),
  );

  server.tool(
    "getBeaconBlock",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockId: z
        .string()
        .describe(
          "Block ID: head, genesis, finalized, slot number, or 0x-prefixed block root",
        ),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconBlock(params),
      "getBeaconBlock",
    ),
  );

  server.tool(
    "getBeaconBlockAttestations",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockId: z
        .string()
        .describe(
          "Block ID: head, genesis, finalized, slot number, or 0x-prefixed block root",
        ),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconBlockAttestations(params),
      "getBeaconBlockAttestations",
    ),
  );

  server.tool(
    "getBeaconBlockRoot",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockId: z
        .string()
        .describe(
          "Block ID: head, genesis, finalized, slot number, or 0x-prefixed block root",
        ),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconBlockRoot(params),
      "getBeaconBlockRoot",
    ),
  );

  server.tool(
    "getBeaconBlobSidecars",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockId: z
        .string()
        .describe(
          "Block ID: head, genesis, finalized, slot number, or 0x-prefixed block root",
        ),
      indices: z
        .array(z.string())
        .optional()
        .describe("Array of blob indices to filter by"),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconBlobSidecars(params),
      "getBeaconBlobSidecars",
    ),
  );

  server.tool(
    "getBeaconHeaders",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      slot: z.string().optional().describe("Slot number to filter by"),
      parentRoot: z.string().optional().describe("Parent root to filter by"),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconHeaders(params),
      "getBeaconHeaders",
    ),
  );

  server.tool(
    "getBeaconHeaderByBlockId",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockId: z
        .string()
        .describe(
          "Block ID: head, genesis, finalized, slot number, or 0x-prefixed block root",
        ),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconHeaderByBlockId(params),
      "getBeaconHeaderByBlockId",
    ),
  );

  server.tool(
    "getBeaconPoolVoluntaryExits",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconPoolVoluntaryExits(params),
      "getBeaconPoolVoluntaryExits",
    ),
  );

  server.tool(
    "getBeaconPoolAttestations",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconPoolAttestations(params),
      "getBeaconPoolAttestations",
    ),
  );

  server.tool(
    "getBeaconStateCommittees",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      stateId: z
        .string()
        .describe("State ID: head, genesis, finalized, slot, or state root"),
      epoch: z.string().optional().describe("Epoch number to filter by"),
      index: z.string().optional().describe("Committee index to filter by"),
      slot: z.string().optional().describe("Slot number to filter by"),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStateCommittees(params),
      "getBeaconStateCommittees",
    ),
  );

  server.tool(
    "getBeaconStateFinalityCheckpoints",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      stateId: z
        .string()
        .describe("State ID: head, genesis, finalized, slot, or state root"),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStateFinalityCheckpoints(params),
      "getBeaconStateFinalityCheckpoints",
    ),
  );

  server.tool(
    "getBeaconStateFork",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      stateId: z
        .string()
        .describe("State ID: head, genesis, finalized, slot, or state root"),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStateFork(params),
      "getBeaconStateFork",
    ),
  );

  server.tool(
    "getBeaconStatePendingConsolidations",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      stateId: z
        .string()
        .describe("State ID: head, genesis, finalized, slot, or state root"),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStatePendingConsolidations(params),
      "getBeaconStatePendingConsolidations",
    ),
  );

  server.tool(
    "getBeaconStateRoot",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      stateId: z
        .string()
        .describe("State ID: head, genesis, finalized, slot, or state root"),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStateRoot(params),
      "getBeaconStateRoot",
    ),
  );

  server.tool(
    "getBeaconStateSyncCommittees",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      stateId: z
        .string()
        .describe("State ID: head, genesis, finalized, slot, or state root"),
      epoch: z.string().optional().describe("Epoch number to filter by"),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStateSyncCommittees(params),
      "getBeaconStateSyncCommittees",
    ),
  );

  server.tool(
    "getBeaconStateRandao",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      stateId: z
        .string()
        .describe("State ID: head, genesis, finalized, slot, or state root"),
      epoch: z.string().describe("Epoch number to get RANDAO for"),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStateRandao(params),
      "getBeaconStateRandao",
    ),
  );

  server.tool(
    "getBeaconStateValidatorBalances",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      stateId: z
        .string()
        .describe("State ID: head, genesis, finalized, slot, or state root"),
      id: z
        .array(z.string())
        .optional()
        .describe("Validator indices or pubkeys to filter by"),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStateValidatorBalances(params),
      "getBeaconStateValidatorBalances",
    ),
  );

  server.tool(
    "getBeaconStateValidators",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      stateId: z
        .string()
        .describe("State ID: head, genesis, finalized, slot, or state root"),
      id: z
        .array(z.string())
        .optional()
        .describe("Validator indices or pubkeys to filter by"),
      status: z
        .array(z.string())
        .optional()
        .describe("Validator statuses to filter by"),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStateValidators(params),
      "getBeaconStateValidators",
    ),
  );

  server.tool(
    "getBeaconStateValidatorById",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      stateId: z
        .string()
        .describe("State ID: head, genesis, finalized, slot, or state root"),
      validatorId: z.string().describe("Validator index or pubkey"),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStateValidatorById(params),
      "getBeaconStateValidatorById",
    ),
  );

  server.tool(
    "getBeaconBlockRewards",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockId: z
        .string()
        .describe(
          "Block ID: head, genesis, finalized, slot number, or 0x-prefixed block root",
        ),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconBlockRewards(params),
      "getBeaconBlockRewards",
    ),
  );

  server.tool(
    "getBeaconConfigSpec",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconConfigSpec(params),
      "getBeaconConfigSpec",
    ),
  );

  server.tool(
    "getBeaconNodeSyncing",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconNodeSyncing(params),
      "getBeaconNodeSyncing",
    ),
  );

  server.tool(
    "getBeaconNodeVersion",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconNodeVersion(params),
      "getBeaconNodeVersion",
    ),
  );

  // ========================================
  // SOLANA DAS API
  // ========================================

  server.tool(
    "solanaGetAsset",
    {
      network: z
        .string()
        .default("solana-mainnet")
        .describe(SOLANA_NETWORK_DESC),
      id: z.string().describe("Asset ID base-58 encoded"),
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetAsset(params),
      "solanaGetAsset",
    ),
  );

  server.tool(
    "solanaGetAssets",
    {
      network: z
        .string()
        .default("solana-mainnet")
        .describe(SOLANA_NETWORK_DESC),
      ids: z.array(z.string()).describe("Array of asset IDs base-58 encoded"),
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetAssets(params),
      "solanaGetAssets",
    ),
  );

  server.tool(
    "solanaGetAssetProof",
    {
      network: z
        .string()
        .default("solana-mainnet")
        .describe(SOLANA_NETWORK_DESC),
      id: z.string().describe("Asset ID base-58 encoded"),
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetAssetProof(params),
      "solanaGetAssetProof",
    ),
  );

  server.tool(
    "solanaGetAssetProofs",
    {
      network: z
        .string()
        .default("solana-mainnet")
        .describe(SOLANA_NETWORK_DESC),
      ids: z.array(z.string()).describe("Array of asset IDs base-58 encoded"),
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetAssetProofs(params),
      "solanaGetAssetProofs",
    ),
  );

  server.tool(
    "solanaGetAssetsByAuthority",
    {
      network: z
        .string()
        .default("solana-mainnet")
        .describe(SOLANA_NETWORK_DESC),
      authorityAddress: z
        .string()
        .describe("Authority address to query assets for"),
      sortBy: z
        .object({})
        .passthrough()
        .optional()
        .describe("Sort criteria object"),
      limit: z
        .number()
        .optional()
        .describe("Number of results to return. Max 1000."),
      page: z.number().optional().describe("Page number for pagination"),
      before: z.string().optional().describe("Cursor for pagination (before)"),
      after: z.string().optional().describe("Cursor for pagination (after)"),
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetAssetsByAuthority(params),
      "solanaGetAssetsByAuthority",
    ),
  );

  server.tool(
    "solanaGetAssetsByCreator",
    {
      network: z
        .string()
        .default("solana-mainnet")
        .describe(SOLANA_NETWORK_DESC),
      creatorAddress: z
        .string()
        .describe("Creator address to query assets for"),
      onlyVerified: z
        .boolean()
        .optional()
        .describe("If true, only returns verified assets"),
      sortBy: z
        .object({})
        .passthrough()
        .optional()
        .describe("Sort criteria object"),
      limit: z
        .number()
        .optional()
        .describe("Number of results to return. Max 1000."),
      page: z.number().optional().describe("Page number for pagination"),
      before: z.string().optional().describe("Cursor for pagination (before)"),
      after: z.string().optional().describe("Cursor for pagination (after)"),
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetAssetsByCreator(params),
      "solanaGetAssetsByCreator",
    ),
  );

  server.tool(
    "solanaGetAssetsByGroup",
    {
      network: z
        .string()
        .default("solana-mainnet")
        .describe(SOLANA_NETWORK_DESC),
      groupKey: z.string().describe("Group key to query by"),
      groupValue: z.string().describe("Group value to query by"),
      sortBy: z
        .object({})
        .passthrough()
        .optional()
        .describe("Sort criteria object"),
      limit: z
        .number()
        .optional()
        .describe("Number of results to return. Max 1000."),
      page: z.number().optional().describe("Page number for pagination"),
      before: z.string().optional().describe("Cursor for pagination (before)"),
      after: z.string().optional().describe("Cursor for pagination (after)"),
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetAssetsByGroup(params),
      "solanaGetAssetsByGroup",
    ),
  );

  server.tool(
    "solanaGetAssetsByOwner",
    {
      network: z
        .string()
        .default("solana-mainnet")
        .describe(SOLANA_NETWORK_DESC),
      ownerAddress: z.string().describe("Owner address to query assets for"),
      sortBy: z
        .object({})
        .passthrough()
        .optional()
        .describe("Sort criteria object"),
      limit: z
        .number()
        .optional()
        .describe("Number of results to return. Max 1000."),
      page: z.number().optional().describe("Page number for pagination"),
      before: z.string().optional().describe("Cursor for pagination (before)"),
      after: z.string().optional().describe("Cursor for pagination (after)"),
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetAssetsByOwner(params),
      "solanaGetAssetsByOwner",
    ),
  );

  server.tool(
    "solanaGetAssetSignatures",
    {
      network: z
        .string()
        .default("solana-mainnet")
        .describe(SOLANA_NETWORK_DESC),
      id: z.string().describe("Asset ID to get signatures for"),
      limit: z.number().optional().describe("Number of results to return"),
      page: z.number().optional().describe("Page number for pagination"),
      before: z.string().optional().describe("Cursor for pagination (before)"),
      after: z.string().optional().describe("Cursor for pagination (after)"),
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetAssetSignatures(params),
      "solanaGetAssetSignatures",
    ),
  );

  server.tool(
    "solanaGetNftEditions",
    {
      network: z
        .string()
        .default("solana-mainnet")
        .describe(SOLANA_NETWORK_DESC),
      mintAddress: z.string().describe("Mint address of the NFT"),
      limit: z.number().optional().describe("Number of results to return"),
      page: z.number().optional().describe("Page number for pagination"),
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetNftEditions(params),
      "solanaGetNftEditions",
    ),
  );

  server.tool(
    "solanaGetTokenAccounts",
    {
      network: z
        .string()
        .default("solana-mainnet")
        .describe(SOLANA_NETWORK_DESC),
      mintAddress: z.string().optional().describe("Mint address to filter by"),
      ownerAddress: z
        .string()
        .optional()
        .describe("Owner address to filter by"),
      limit: z.number().optional().describe("Number of results to return"),
      cursor: z.string().optional().describe("Cursor for pagination"),
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetTokenAccounts(params),
      "solanaGetTokenAccounts",
    ),
  );

  server.tool(
    "solanaSearchAssets",
    {
      network: z
        .string()
        .default("solana-mainnet")
        .describe(SOLANA_NETWORK_DESC),
      ownerAddress: z
        .string()
        .optional()
        .describe("Owner address to filter by"),
      creatorAddress: z
        .string()
        .optional()
        .describe("Creator address to filter by"),
      authorityAddress: z
        .string()
        .optional()
        .describe("Authority address to filter by"),
      grouping: z.array(z.string()).optional().describe("Grouping criteria"),
      burnt: z.boolean().optional().describe("Filter by burnt status"),
      frozen: z.boolean().optional().describe("Filter by frozen status"),
      negate: z.boolean().optional().describe("Negate the search filters"),
      conditionType: z
        .string()
        .optional()
        .describe("Condition type for combining filters"),
      sortBy: z
        .object({})
        .passthrough()
        .optional()
        .describe("Sort criteria object"),
      limit: z.number().optional().describe("Number of results to return"),
      page: z.number().optional().describe("Page number for pagination"),
      before: z.string().optional().describe("Cursor for pagination (before)"),
      after: z.string().optional().describe("Cursor for pagination (after)"),
    },
    handleToolCall(
      (params) => alchemyApi.solanaSearchAssets(params),
      "solanaSearchAssets",
    ),
  );
}
