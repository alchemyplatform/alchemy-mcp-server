import "reflect-metadata";

import assert from "node:assert";
import { describe, it } from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { AlchemyApi } from "../api/alchemyApi.js";
import { registerTools } from "../api/registerTools.js";

// ========================================
// Mock AlchemyApi — returns canned responses
// ========================================

function createMockAlchemyApi(): AlchemyApi {
  const mock = {
    getTokenPriceBySymbol: async () => ({
      data: [
        { symbol: "ETH", price: "2500.00", currency: "USD" },
        { symbol: "BTC", price: "65000.00", currency: "USD" },
      ],
    }),

    getTokenPriceByAddress: async () => ({
      data: [
        {
          address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          network: "eth-mainnet",
          price: "1.00",
        },
      ],
    }),

    getTokenPriceHistoryBySymbol: async () => ({
      data: {
        symbol: "ETH",
        history: [
          { timestamp: "2024-01-01T00:00:00Z", price: "2300.00" },
          { timestamp: "2024-01-02T00:00:00Z", price: "2400.00" },
        ],
      },
    }),

    getTokensByMultichainAddress: async () => ({
      tokens: [
        {
          address: "0xABC",
          network: "eth-mainnet",
          balance: "1000000000000000000",
        },
      ],
    }),

    getTransactionHistoryByMultichainAddress: async () => ({
      transactions: [
        {
          hash: "0xdef",
          blockTimestamp: "1700000000",
          value: "1000000000000000000",
          from: "0xaaa",
          to: "0xbbb",
        },
      ],
      cursor: "next-page",
    }),

    getAssetTransfers: async () => ({
      result: {
        transfers: [{ from: "0xaaa", to: "0xbbb", value: 1.5, asset: "ETH" }],
      },
    }),

    getNftsForAddress: async () => ({
      nfts: [
        {
          contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
          tokenId: "1234",
          name: "Bored Ape #1234",
        },
      ],
    }),

    getNftContractsByAddress: async () => ({
      contracts: [
        {
          address: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
          name: "BoredApeYachtClub",
          symbol: "BAYC",
        },
      ],
    }),

    sendTransaction: async () => ({
      hash: "0x123abc",
      status: "sent",
    }),

    swap: async () => ({
      hash: "0x456def",
      status: "swapped",
    }),
  } as unknown as AlchemyApi;

  return mock;
}

// ========================================
// Helpers
// ========================================

async function setupTestClient() {
  const alchemyApi = createMockAlchemyApi();
  const server = new McpServer({ name: "test-server", version: "0.0.1" });

  registerTools(server, alchemyApi);

  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.1" });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return { client, server };
}

function parseToolResponse(result: { content: Array<{ text?: string }> }) {
  const text = result.content[0]?.text;
  assert.ok(text, "Tool response should have text content");
  return JSON.parse(text);
}

// ========================================
// Tool Behavior Tests
// ========================================

describe("Tool Behavior", () => {
  it("fetchTokenPriceBySymbol returns price data", async () => {
    const { client, server } = await setupTestClient();

    const result = await client.callTool({
      name: "fetchTokenPriceBySymbol",
      arguments: { symbols: ["ETH", "BTC"] },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.data, "Response should have data field");
    assert.strictEqual(data.data.length, 2, "Should return 2 prices");
    assert.strictEqual(data.data[0].symbol, "ETH");
    assert.strictEqual(data.data[1].price, "65000.00");

    await client.close();
    await server.close();
  });

  it("fetchTokenPriceByAddress returns price data", async () => {
    const { client, server } = await setupTestClient();

    const result = await client.callTool({
      name: "fetchTokenPriceByAddress",
      arguments: {
        addresses: [
          {
            address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            network: "eth-mainnet",
          },
        ],
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.data, "Response should have data field");
    assert.strictEqual(data.data[0].price, "1.00");

    await client.close();
    await server.close();
  });

  it("fetchAddressTransactionHistory enriches transactions with date and ethValue", async () => {
    const { client, server } = await setupTestClient();

    const result = await client.callTool({
      name: "fetchAddressTransactionHistory",
      arguments: {
        addresses: [{ address: "0xaaa", networks: ["eth-mainnet"] }],
      },
    });

    const data = parseToolResponse(result as never);
    const tx = data.transactions[0];
    assert.ok(tx.date, "Transaction should have enriched 'date' field");
    assert.ok(tx.ethValue, "Transaction should have enriched 'ethValue' field");
    assert.strictEqual(tx.hash, "0xdef");
    assert.ok(data.cursor, "Response should have cursor for pagination");

    await client.close();
    await server.close();
  });

  it("fetchTokensOwnedByMultichainAddresses returns token data", async () => {
    const { client, server } = await setupTestClient();

    const result = await client.callTool({
      name: "fetchTokensOwnedByMultichainAddresses",
      arguments: {
        addresses: [{ address: "0xaaa", networks: ["eth-mainnet"] }],
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.tokens, "Response should have tokens field");
    assert.strictEqual(data.tokens[0].address, "0xABC");

    await client.close();
    await server.close();
  });

  it("fetchTransfers returns transfer data", async () => {
    const { client, server } = await setupTestClient();

    const result = await client.callTool({
      name: "fetchTransfers",
      arguments: {
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.result.transfers, "Response should have transfers");
    assert.strictEqual(data.result.transfers[0].asset, "ETH");

    await client.close();
    await server.close();
  });

  it("fetchNftsOwnedByMultichainAddresses returns NFT data", async () => {
    const { client, server } = await setupTestClient();

    const result = await client.callTool({
      name: "fetchNftsOwnedByMultichainAddresses",
      arguments: {
        addresses: [
          {
            address: "0xaaa",
            networks: ["eth-mainnet"],
            excludeFilters: ["SPAM"],
            includeFilters: [],
            spamConfidenceLevel: "HIGH",
          },
        ],
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.nfts, "Response should have nfts field");
    assert.strictEqual(data.nfts[0].tokenId, "1234");

    await client.close();
    await server.close();
  });

  it("sendTransaction returns transaction hash", async () => {
    const { client, server } = await setupTestClient();

    const result = await client.callTool({
      name: "sendTransaction",
      arguments: {
        ownerScaAccountAddress: "0xowner",
        signerAddress: "0xsigner",
        toAddress: "0xrecipient",
        value: "1.0",
      },
    });

    const data = parseToolResponse(result as never);
    assert.strictEqual(data.hash, "0x123abc");
    assert.strictEqual(data.status, "sent");

    await client.close();
    await server.close();
  });

  it("tool errors return structured error response", async () => {
    const alchemyApi = createMockAlchemyApi();
    // Override one method to throw
    alchemyApi.getTokenPriceBySymbol = async () => {
      throw new Error("API rate limit exceeded");
    };

    const server = new McpServer({ name: "test-server", version: "0.0.1" });
    registerTools(server, alchemyApi);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "0.0.1" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.callTool({
      name: "fetchTokenPriceBySymbol",
      arguments: { symbols: ["ETH"] },
    });

    const response = result as {
      content: Array<{ text?: string }>;
      isError?: boolean;
    };
    assert.strictEqual(response.isError, true, "Should flag as error");
    assert.ok(
      response.content[0]?.text?.includes("API rate limit exceeded"),
      "Error message should be passed through",
    );

    await client.close();
    await server.close();
  });
});
