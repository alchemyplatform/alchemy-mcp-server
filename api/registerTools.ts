import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { isAxiosError } from "axios";
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

// Extract a concise, human-readable message from an API error.
// Alchemy responses use several shapes — this pulls the deepest message it can find.
function formatError(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    const message = extractMessage(data) ?? error.message;
    return status ? `Error ${status}: ${message}` : `Error: ${message}`;
  }
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return "Unknown error occurred";
}

// Walk common Alchemy / JSON-RPC / REST error shapes to find the message string.
function extractMessage(data: unknown): string | undefined {
  if (data == null) return undefined;
  if (typeof data === "string") return data;
  if (typeof data !== "object") return String(data); // eslint-disable-line @typescript-eslint/no-base-to-string

  const obj = data as Record<string, unknown>;

  // JSON-RPC: { error: { message: "..." } }
  if (obj.error && typeof obj.error === "object") {
    const inner = obj.error as Record<string, unknown>;
    if (typeof inner.message === "string") return inner.message;
  }
  // REST: { error: "..." }
  if (typeof obj.error === "string") return obj.error;
  // REST: { message: "..." }
  if (typeof obj.message === "string") return obj.message;

  return undefined;
}

// Errors that indicate a method/feature is not supported on a given network.
// These are expected and not actionable — no need to log them.
const NOT_SUPPORTED_RE =
  /not supported|unsupported|not available|does not support|not enabled|isn't enabled|enotfound|error 404|error 500|unable to complete request|internal error|contact the alchemy team|is required for|expect \d+ arguments/i;

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
      const message = formatError(error);
      if (!NOT_SUPPORTED_RE.test(message)) {
        const network =
          params?.network || params?.addresses?.[0]?.network || "";
        console.error(
          `Error in ${name}${network ? ` [${network}]` : ""}: ${message}`,
        );
      }
      return {
        content: [{ type: "text" as const, text: message }],
        isError: true,
      };
    }
  };

export function registerTools(server: McpServer, alchemyApi: AlchemyApi) {
  // ========================================
  // NETWORK DISCOVERY
  // ========================================

  server.tool(
    "listSupportedNetworks",
    "List all blockchain networks supported by Alchemy, including EVM and Solana chains",
    {},
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    () => ({
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(SUPPORTED_NETWORKS, null, 2),
        },
      ],
    }),
  );

  // ========================================
  // PRICES API
  // ========================================

  server.tool(
    "fetchTokenPriceBySymbol",
    "Get current USD prices for tokens by their ticker symbol (e.g. BTC, ETH)",
    {
      symbols: z
        .array(z.string())
        .describe(
          'A list of blockchaintoken symbols to query. e.g. ["BTC", "ETH"]',
        ),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getTokenPriceBySymbol(params),
      "fetchTokenPriceBySymbol",
    ),
  );

  server.tool(
    "fetchTokenPriceByAddress",
    "Get current USD prices for tokens by their contract address and network",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getTokenPriceByAddress(params),
      "fetchTokenPriceByAddress",
    ),
  );

  server.tool(
    "fetchTokenPriceHistoryBySymbol",
    "Get historical token price data over a date range with configurable interval",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
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
    'Get historical token prices using natural language time frames like "last week" or "past 7 days"',
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
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
    "Get all ERC-20 tokens owned by wallet addresses across multiple chains",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
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
    "Get transaction history for wallet addresses across multiple chains, with human-readable dates and ETH values",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
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
    "Get token and ETH transfers filtered by address, block range, or contract",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
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
    "Get NFTs owned by wallet addresses across multiple chains, with spam filtering",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getNftsForAddress(params),
      "fetchNftsOwnedByMultichainAddresses",
    ),
  );

  server.tool(
    "fetchNftContractDataByMultichainAddress",
    "Get NFT contract data for wallet addresses across multiple chains",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
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
    "Send a transaction from a smart contract account (SCA) via the Alchemy wallet API. Requires AGENT_WALLET_SERVER",
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
    {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
      idempotentHint: false,
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
    "Initiate a token swap from a smart contract account (SCA) via the Alchemy wallet API. Requires AGENT_WALLET_SERVER",
    {
      ownerScaAccountAddress: z
        .string()
        .describe("The owner SCA account address."),
      signerAddress: z
        .string()
        .describe("The signer address to send the transaction from."),
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
      idempotentHint: false,
    },
    handleToolCall((params) => alchemyApi.swap(params), "swap"),
  );

  // ========================================
  // NFT V3 API (single-chain GET endpoints)
  // ========================================

  server.tool(
    "getNFTsForOwner",
    "Get all NFTs owned by an address on a single network, with metadata and spam filtering options",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getNFTsForOwner(params),
      "getNFTsForOwner",
    ),
  );

  server.tool(
    "getNFTsForContract",
    "Get all NFTs in a specific contract or collection with optional metadata",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getNFTsForContract(params),
      "getNFTsForContract",
    ),
  );

  server.tool(
    "getNFTsForCollection",
    "Get all NFTs in a collection by contract address or OpenSea slug",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getNFTsForCollection(params),
      "getNFTsForCollection",
    ),
  );

  server.tool(
    "getNFTMetadata",
    "Get metadata for a specific NFT by contract address and token ID",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getNFTMetadata(params),
      "getNFTMetadata",
    ),
  );

  server.tool(
    "getContractMetadata",
    "Get metadata for an NFT contract (name, symbol, total supply, etc.)",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z
        .string()
        .describe("Contract address for the NFT contract."),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getContractMetadata(params),
      "getContractMetadata",
    ),
  );

  server.tool(
    "getCollectionMetadata",
    "Get metadata for an NFT collection by its OpenSea slug",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      collectionSlug: z
        .string()
        .describe("OpenSea slug for the NFT collection."),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getCollectionMetadata(params),
      "getCollectionMetadata",
    ),
  );

  server.tool(
    "invalidateNFTContractCache",
    "Invalidate cached metadata for an NFT contract to force a refresh on next query",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z
        .string()
        .describe("Contract address to invalidate cached metadata for."),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.invalidateContract(params),
      "invalidateNFTContractCache",
    ),
  );

  server.tool(
    "getOwnersForNFT",
    "Get all owner addresses for a specific NFT token",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z.string().describe("Contract address for the NFT."),
      tokenId: z.string().describe("The token ID to get owners for."),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getOwnersForNFT(params),
      "getOwnersForNFT",
    ),
  );

  server.tool(
    "getOwnersForContract",
    "Get all owner addresses for an NFT contract, optionally with token balances",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getOwnersForContract(params),
      "getOwnersForContract",
    ),
  );

  server.tool(
    "getSpamContracts",
    "Get a list of all known spam NFT contract addresses on a network",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getSpamContracts(params),
      "getSpamContracts",
    ),
  );

  server.tool(
    "isSpamContract",
    "Check if a specific contract address is flagged as spam",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z
        .string()
        .describe("Contract address to check for spam status."),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.isSpamContract(params),
      "isSpamContract",
    ),
  );

  server.tool(
    "isAirdropNFT",
    "Check if a specific NFT is flagged as an airdrop",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z.string().describe("Contract address of the NFT."),
      tokenId: z.string().describe("The token ID to check."),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall((params) => alchemyApi.isAirdropNFT(params), "isAirdropNFT"),
  );

  server.tool(
    "summarizeNFTAttributes",
    "Get a summary of trait/attribute distribution for an NFT collection",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z
        .string()
        .describe("Contract address of the NFT collection."),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.summarizeNFTAttributes(params),
      "summarizeNFTAttributes",
    ),
  );

  server.tool(
    "getFloorPrice",
    "Get the marketplace floor price for an NFT collection",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getFloorPrice(params),
      "getFloorPrice",
    ),
  );

  server.tool(
    "searchContractMetadata",
    "Search for NFT contracts by keyword in their metadata",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      query: z
        .string()
        .describe("Search keyword to match against NFT contract metadata."),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.searchContractMetadata(params),
      "searchContractMetadata",
    ),
  );

  server.tool(
    "isHolderOfContract",
    "Check if a wallet address owns any NFTs from a specific contract",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      wallet: z
        .string()
        .describe("Wallet address to check for contract ownership."),
      contractAddress: z
        .string()
        .describe("Contract address for the NFT contract."),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.isHolderOfContract(params),
      "isHolderOfContract",
    ),
  );

  server.tool(
    "computeRarity",
    "Compute the rarity score for a specific NFT within its collection",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z
        .string()
        .describe("Contract address of the NFT collection."),
      tokenId: z
        .string()
        .describe("Token ID of the NFT to compute rarity for."),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.computeRarity(params),
      "computeRarity",
    ),
  );

  server.tool(
    "getNFTSales",
    "Get historical NFT sales data, filterable by marketplace, contract, buyer, or seller",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall((params) => alchemyApi.getNFTSales(params), "getNFTSales"),
  );

  server.tool(
    "getContractsForOwner",
    "Get all NFT contracts that an address owns tokens in",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getContractsForOwner(params),
      "getContractsForOwner",
    ),
  );

  server.tool(
    "getCollectionsForOwner",
    "Get all NFT collections that an address owns tokens in",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getCollectionsForOwner(params),
      "getCollectionsForOwner",
    ),
  );

  server.tool(
    "reportSpam",
    "Report an NFT contract address as spam or not spam",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      address: z.string().describe("The address to report as spam."),
      isSpam: z.boolean().describe("Whether the address is spam."),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
      idempotentHint: false,
    },
    handleToolCall((params) => alchemyApi.reportSpam(params), "reportSpam"),
  );

  // ========================================
  // Token API (JSON-RPC)
  // ========================================

  server.tool(
    "getTokenAllowance",
    "Get the ERC-20 token allowance a spender has been granted by an owner",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contract: z.string().describe("The token contract address."),
      owner: z.string().describe("The address of the token owner."),
      spender: z.string().describe("The address of the spender."),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getTokenAllowance(params),
      "getTokenAllowance",
    ),
  );

  server.tool(
    "getTokenBalances",
    "Get ERC-20 token balances for a wallet address on a single network",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getTokenBalances(params),
      "getTokenBalances",
    ),
  );

  server.tool(
    "getTokenMetadata",
    "Get metadata (name, symbol, decimals, logo) for an ERC-20 token contract",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      contractAddress: z
        .string()
        .describe("The token contract address to get metadata for."),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
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
    "Get all transaction receipts for a given block by number or hash",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
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
    "Get the raw RLP-encoded block data for a given block number or tag",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockNumberOrTag: z
        .string()
        .describe("Block number in hex or tag like 'latest'"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.debugGetRawBlock(params),
      "debugGetRawBlock",
    ),
  );

  server.tool(
    "debugGetRawHeader",
    "Get the raw RLP-encoded block header for a given block number or tag",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockNumberOrTag: z
        .string()
        .describe("Block number in hex or tag like 'latest'"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.debugGetRawHeader(params),
      "debugGetRawHeader",
    ),
  );

  server.tool(
    "debugGetRawReceipts",
    "Get the raw receipt data for all transactions in a block",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockNumberOrTag: z
        .string()
        .describe("Block number in hex or tag like 'latest'"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.debugGetRawReceipts(params),
      "debugGetRawReceipts",
    ),
  );

  server.tool(
    "debugTraceBlockByHash",
    "Replay and trace all transactions in a block identified by its hash",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockHash: z.string().describe("32-byte block hash"),
      tracer: z.object({}).passthrough().optional().describe("Tracer options"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.debugTraceBlockByHash(params),
      "debugTraceBlockByHash",
    ),
  );

  server.tool(
    "debugTraceBlockByNumber",
    "Replay and trace all transactions in a block identified by its number",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockNumberOrTag: z
        .string()
        .describe("Block number in hex or tag like 'latest'"),
      tracer: z.object({}).passthrough().optional().describe("Tracer options"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.debugTraceBlockByNumber(params),
      "debugTraceBlockByNumber",
    ),
  );

  server.tool(
    "debugTraceCall",
    "Trace a call without executing it on-chain — useful for debugging contract interactions",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.debugTraceCall(params),
      "debugTraceCall",
    ),
  );

  server.tool(
    "debugTraceTransaction",
    "Get a detailed execution trace of an already-mined transaction",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      transactionHash: z.string().describe("Transaction hash"),
      options: z
        .object({})
        .passthrough()
        .optional()
        .describe("Options including tracer type and config"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
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
    "Get Parity-style execution traces for all transactions in a block",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockIdentifier: z
        .string()
        .default("latest")
        .describe("Block identifier (number, hash, or tag)"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall((params) => alchemyApi.traceBlock(params), "traceBlock"),
  );

  server.tool(
    "traceCall",
    "Execute and trace a call without broadcasting it (Parity-style tracing)",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall((params) => alchemyApi.traceCall(params), "traceCall"),
  );

  server.tool(
    "traceGet",
    "Get a specific sub-trace within a transaction by index position",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      transactionHash: z.string().describe("Transaction hash"),
      traceIndexes: z.array(z.string()).describe("Hex index positions"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall((params) => alchemyApi.traceGet(params), "traceGet"),
  );

  server.tool(
    "traceRawTransaction",
    "Trace a raw signed transaction without broadcasting it to the network",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      rawTransaction: z.string().describe("Raw transaction data"),
      traceTypes: z
        .array(z.string())
        .describe('Array of trace types. e.g. ["trace", "stateDiff"]'),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.traceRawTransaction(params),
      "traceRawTransaction",
    ),
  );

  server.tool(
    "traceReplayBlockTransactions",
    "Replay all transactions in a block and return traces with optional state diffs",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockIdentifier: z
        .string()
        .describe("Block identifier (number, hash, or tag)"),
      traceTypes: z
        .array(z.string())
        .describe('Array of trace types. e.g. ["trace", "stateDiff"]'),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.traceReplayBlockTransactions(params),
      "traceReplayBlockTransactions",
    ),
  );

  server.tool(
    "traceReplayTransaction",
    "Replay a specific transaction and return its trace with optional state diffs",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      transactionHash: z.string().describe("Transaction hash"),
      traceTypes: z
        .array(z.string())
        .describe('Array of trace types. e.g. ["trace", "stateDiff"]'),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.traceReplayTransaction(params),
      "traceReplayTransaction",
    ),
  );

  server.tool(
    "traceTransaction",
    "Get the Parity-style execution trace of an already-mined transaction",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      transactionHash: z.string().describe("Transaction hash"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.traceTransaction(params),
      "traceTransaction",
    ),
  );

  server.tool(
    "traceFilter",
    "Search for traces matching criteria like sender, recipient, and block range",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall((params) => alchemyApi.traceFilter(params), "traceFilter"),
  );

  // ========================================
  // TRANSACTION SIMULATION API
  // ========================================

  server.tool(
    "simulateAssetChanges",
    "Simulate a transaction and preview what asset changes (token transfers, ETH movements) would occur",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.simulateAssetChanges(params),
      "simulateAssetChanges",
    ),
  );

  server.tool(
    "simulateAssetChangesBundle",
    "Simulate a bundle of 1-2 transactions and preview the combined asset changes",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.simulateAssetChangesBundle(params),
      "simulateAssetChangesBundle",
    ),
  );

  server.tool(
    "simulateExecution",
    "Simulate full transaction execution and get detailed call traces, logs, and return data",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.simulateExecution(params),
      "simulateExecution",
    ),
  );

  server.tool(
    "simulateExecutionBundle",
    "Simulate execution of a bundle of 1-2 transactions with full call traces",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
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
    "Get the recommended max priority fee per gas for EIP-1559 transactions",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getMaxPriorityFeePerGas(params),
      "getMaxPriorityFeePerGas",
    ),
  );

  server.tool(
    "getUserOperationReceipt",
    "Get the receipt for an ERC-4337 user operation by its hash",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      userOpHash: z.string().describe("The user operation hash"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getUserOperationReceipt(params),
      "getUserOperationReceipt",
    ),
  );

  server.tool(
    "getSupportedEntryPoints",
    "Get the entry point contract addresses supported for ERC-4337 account abstraction",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getSupportedEntryPoints(params),
      "getSupportedEntryPoints",
    ),
  );

  server.tool(
    "getUserOperationByHash",
    "Get details of an ERC-4337 user operation by its hash",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      userOpHash: z.string().describe("The user operation hash"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getUserOperationByHash(params),
      "getUserOperationByHash",
    ),
  );

  server.tool(
    "estimateUserOperationGas",
    "Estimate gas costs for an ERC-4337 user operation against an entry point",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
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
    "Simulate an ERC-4337 user operation and preview the predicted asset changes",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
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
    "Get Ethereum Beacon Chain genesis information (time, validator root, fork version)",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconGenesis(params),
      "getBeaconGenesis",
    ),
  );

  server.tool(
    "getBeaconBlock",
    "Get a Beacon Chain block by slot number, root, or keyword (head, finalized, genesis)",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockId: z
        .string()
        .describe(
          "Block ID: head, genesis, finalized, slot number, or 0x-prefixed block root",
        ),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconBlock(params),
      "getBeaconBlock",
    ),
  );

  server.tool(
    "getBeaconBlockAttestations",
    "Get attestations included in a specific Beacon Chain block",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockId: z
        .string()
        .describe(
          "Block ID: head, genesis, finalized, slot number, or 0x-prefixed block root",
        ),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconBlockAttestations(params),
      "getBeaconBlockAttestations",
    ),
  );

  server.tool(
    "getBeaconBlockRoot",
    "Get the root hash of a specific Beacon Chain block",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockId: z
        .string()
        .describe(
          "Block ID: head, genesis, finalized, slot number, or 0x-prefixed block root",
        ),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconBlockRoot(params),
      "getBeaconBlockRoot",
    ),
  );

  server.tool(
    "getBeaconBlobSidecars",
    "Get blob sidecars for a Beacon Chain block (EIP-4844 blob data)",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconBlobSidecars(params),
      "getBeaconBlobSidecars",
    ),
  );

  server.tool(
    "getBeaconHeaders",
    "Get Beacon Chain block headers, optionally filtered by slot or parent root",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      slot: z.string().optional().describe("Slot number to filter by"),
      parentRoot: z.string().optional().describe("Parent root to filter by"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconHeaders(params),
      "getBeaconHeaders",
    ),
  );

  server.tool(
    "getBeaconHeaderByBlockId",
    "Get a specific Beacon Chain block header by its block ID",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockId: z
        .string()
        .describe(
          "Block ID: head, genesis, finalized, slot number, or 0x-prefixed block root",
        ),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconHeaderByBlockId(params),
      "getBeaconHeaderByBlockId",
    ),
  );

  server.tool(
    "getBeaconPoolVoluntaryExits",
    "Get voluntary validator exit messages currently in the Beacon Chain mempool",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconPoolVoluntaryExits(params),
      "getBeaconPoolVoluntaryExits",
    ),
  );

  server.tool(
    "getBeaconPoolAttestations",
    "Get attestations currently pending in the Beacon Chain mempool",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconPoolAttestations(params),
      "getBeaconPoolAttestations",
    ),
  );

  server.tool(
    "getBeaconStateCommittees",
    "Get beacon committee assignments for a given state, optionally filtered by epoch/slot",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      stateId: z
        .string()
        .describe("State ID: head, genesis, finalized, slot, or state root"),
      epoch: z.string().optional().describe("Epoch number to filter by"),
      index: z.string().optional().describe("Committee index to filter by"),
      slot: z.string().optional().describe("Slot number to filter by"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStateCommittees(params),
      "getBeaconStateCommittees",
    ),
  );

  server.tool(
    "getBeaconStateFinalityCheckpoints",
    "Get finality checkpoints (justified and finalized epochs) for a given state",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      stateId: z
        .string()
        .describe("State ID: head, genesis, finalized, slot, or state root"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStateFinalityCheckpoints(params),
      "getBeaconStateFinalityCheckpoints",
    ),
  );

  server.tool(
    "getBeaconStateFork",
    "Get the fork version information for a given Beacon Chain state",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      stateId: z
        .string()
        .describe("State ID: head, genesis, finalized, slot, or state root"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStateFork(params),
      "getBeaconStateFork",
    ),
  );

  server.tool(
    "getBeaconStatePendingConsolidations",
    "Get pending validator consolidation requests for a given state",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      stateId: z
        .string()
        .describe("State ID: head, genesis, finalized, slot, or state root"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStatePendingConsolidations(params),
      "getBeaconStatePendingConsolidations",
    ),
  );

  server.tool(
    "getBeaconStateRoot",
    "Get the state root hash for a given Beacon Chain state",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      stateId: z
        .string()
        .describe("State ID: head, genesis, finalized, slot, or state root"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStateRoot(params),
      "getBeaconStateRoot",
    ),
  );

  server.tool(
    "getBeaconStateSyncCommittees",
    "Get sync committee assignments for a given state and optional epoch",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      stateId: z
        .string()
        .describe("State ID: head, genesis, finalized, slot, or state root"),
      epoch: z.string().optional().describe("Epoch number to filter by"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStateSyncCommittees(params),
      "getBeaconStateSyncCommittees",
    ),
  );

  server.tool(
    "getBeaconStateRandao",
    "Get the RANDAO mix value for a given Beacon Chain state and optional epoch",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      stateId: z
        .string()
        .describe("State ID: head, genesis, finalized, slot, or state root"),
      epoch: z.string().optional().describe("Epoch number to get RANDAO for"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStateRandao(params),
      "getBeaconStateRandao",
    ),
  );

  server.tool(
    "getBeaconStateValidatorBalances",
    "Get validator ETH balances for a given state, optionally filtered by validator ID",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStateValidatorBalances(params),
      "getBeaconStateValidatorBalances",
    ),
  );

  server.tool(
    "getBeaconStateValidators",
    "Get validator details for a given state, optionally filtered by ID or status",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStateValidators(params),
      "getBeaconStateValidators",
    ),
  );

  server.tool(
    "getBeaconStateValidatorById",
    "Get full details for a specific Beacon Chain validator by index or public key",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      stateId: z
        .string()
        .describe("State ID: head, genesis, finalized, slot, or state root"),
      validatorId: z.string().describe("Validator index or pubkey"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconStateValidatorById(params),
      "getBeaconStateValidatorById",
    ),
  );

  server.tool(
    "getBeaconBlockRewards",
    "Get the block rewards breakdown (proposer, attestation, sync committee) for a Beacon block",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
      blockId: z
        .string()
        .describe(
          "Block ID: head, genesis, finalized, slot number, or 0x-prefixed block root",
        ),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconBlockRewards(params),
      "getBeaconBlockRewards",
    ),
  );

  server.tool(
    "getBeaconConfigSpec",
    "Get the full Beacon Chain configuration specification and protocol constants",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconConfigSpec(params),
      "getBeaconConfigSpec",
    ),
  );

  server.tool(
    "getBeaconNodeSyncing",
    "Check whether a Beacon Chain node is currently syncing and its sync progress",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.getBeaconNodeSyncing(params),
      "getBeaconNodeSyncing",
    ),
  );

  server.tool(
    "getBeaconNodeVersion",
    "Get the software version string of the Beacon Chain node",
    {
      network: z.string().default("eth-mainnet").describe(NETWORK_DESC),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
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
    "Get detailed information about a Solana asset (token, NFT, or compressed NFT) by its mint ID",
    {
      network: z
        .string()
        .default("solana-mainnet")
        .describe(SOLANA_NETWORK_DESC),
      id: z.string().describe("Asset ID base-58 encoded"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetAsset(params),
      "solanaGetAsset",
    ),
  );

  server.tool(
    "solanaGetAssets",
    "Get detailed information about multiple Solana assets by their mint IDs in a single request",
    {
      network: z
        .string()
        .default("solana-mainnet")
        .describe(SOLANA_NETWORK_DESC),
      ids: z.array(z.string()).describe("Array of asset IDs base-58 encoded"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetAssets(params),
      "solanaGetAssets",
    ),
  );

  server.tool(
    "solanaGetAssetProof",
    "Get the Merkle proof for a compressed Solana asset, needed for on-chain verification",
    {
      network: z
        .string()
        .default("solana-mainnet")
        .describe(SOLANA_NETWORK_DESC),
      id: z.string().describe("Asset ID base-58 encoded"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetAssetProof(params),
      "solanaGetAssetProof",
    ),
  );

  server.tool(
    "solanaGetAssetProofs",
    "Get Merkle proofs for multiple compressed Solana assets in a single request",
    {
      network: z
        .string()
        .default("solana-mainnet")
        .describe(SOLANA_NETWORK_DESC),
      ids: z.array(z.string()).describe("Array of asset IDs base-58 encoded"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetAssetProofs(params),
      "solanaGetAssetProofs",
    ),
  );

  server.tool(
    "solanaGetAssetsByAuthority",
    "Get all Solana assets managed by a specific authority address",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetAssetsByAuthority(params),
      "solanaGetAssetsByAuthority",
    ),
  );

  server.tool(
    "solanaGetAssetsByCreator",
    "Get all Solana assets created by a specific address, with optional verification filter",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetAssetsByCreator(params),
      "solanaGetAssetsByCreator",
    ),
  );

  server.tool(
    "solanaGetAssetsByGroup",
    "Get all Solana assets in a specific group (e.g. an NFT collection)",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetAssetsByGroup(params),
      "solanaGetAssetsByGroup",
    ),
  );

  server.tool(
    "solanaGetAssetsByOwner",
    "Get all Solana assets (tokens, NFTs) owned by a specific wallet address",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetAssetsByOwner(params),
      "solanaGetAssetsByOwner",
    ),
  );

  server.tool(
    "solanaGetAssetSignatures",
    "Get transaction signatures associated with a specific Solana asset",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetAssetSignatures(params),
      "solanaGetAssetSignatures",
    ),
  );

  server.tool(
    "solanaGetNftEditions",
    "Get edition information (master/print editions) for a Solana NFT",
    {
      network: z
        .string()
        .default("solana-mainnet")
        .describe(SOLANA_NETWORK_DESC),
      mintAddress: z.string().describe("Mint address of the NFT"),
      limit: z.number().optional().describe("Number of results to return"),
      page: z.number().optional().describe("Page number for pagination"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetNftEditions(params),
      "solanaGetNftEditions",
    ),
  );

  server.tool(
    "solanaGetTokenAccounts",
    "Get Solana SPL token accounts filtered by mint address or owner",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.solanaGetTokenAccounts(params),
      "solanaGetTokenAccounts",
    ),
  );

  server.tool(
    "solanaSearchAssets",
    "Search for Solana assets with flexible filters (owner, creator, authority, burnt, frozen status)",
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
    {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    handleToolCall(
      (params) => alchemyApi.solanaSearchAssets(params),
      "solanaSearchAssets",
    ),
  );
}
