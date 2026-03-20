import "reflect-metadata";

import assert from "node:assert";
import { after, before, describe, it } from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { AlchemyApi } from "../api/alchemyApi.js";
import { registerTools } from "../api/registerTools.js";
import { setupDi } from "../di/di-container.js";
import { ClientsModule } from "../di/modules/clients.module.js";

// ========================================
// Test Fixtures — well-known on-chain data
// ========================================

const VITALIK = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const USDC_ETH = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const BAYC = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D";
const KNOWN_TX =
  "0x9b27af6fb9c84a0a40ae1e2b56c09e59e498c56e94e1653ef8ef43cb250e984e";
const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
// Known Solana wallet (Toly — Solana co-founder)
const SOL_WALLET = "toly.sol";

const TIMEOUT = 30_000;

// ========================================
// Skip entire suite if no API key
// ========================================

const HAS_API_KEY = Boolean(process.env.ALCHEMY_API_KEY);

describe("E2E: Alchemy MCP Server", { skip: !HAS_API_KEY }, () => {
  let client: Client;
  let server: McpServer;

  before(async () => {
    const container = setupDi([new ClientsModule()]);
    const alchemyApi = container.get(AlchemyApi);

    server = new McpServer({ name: "e2e-server", version: "0.0.1" });
    registerTools(server, alchemyApi);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    client = new Client({ name: "e2e-client", version: "0.0.1" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  after(async () => {
    await client?.close();
    await server?.close();
  });

  // Helper: call a tool, parse its JSON response, assert no error
  async function callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<any> {
    const result = await client.callTool({ name, arguments: args });
    assert.ok(
      !result.isError,
      `Tool "${name}" returned error: ${(result.content as any)?.[0]?.text}`,
    );
    const text = (result.content as any)?.[0]?.text;
    assert.ok(text, `Tool "${name}" returned no text content`);
    return JSON.parse(text);
  }

  // ========================================
  // Network Discovery
  // ========================================

  describe("Network Discovery", () => {
    it("listSupportedNetworks", { timeout: TIMEOUT }, async () => {
      const data = await callTool("listSupportedNetworks", {});
      assert.ok(data.evm, "Should have evm key");
      assert.ok(data.beacon, "Should have beacon key");
      assert.ok(data.solana, "Should have solana key");
      assert.ok(data.nonEvm, "Should have nonEvm key");
      assert.ok(data.testnetOnly, "Should have testnetOnly key");
      assert.ok(data.alchemyInternal, "Should have alchemyInternal key");
      assert.ok(Array.isArray(data.evm), "evm should be an array");
      assert.ok(data.evm.length > 0, "evm should have entries");
    });
  });

  // ========================================
  // Prices API
  // ========================================

  describe("Prices API", () => {
    it("fetchTokenPriceBySymbol", { timeout: TIMEOUT }, async () => {
      const data = await callTool("fetchTokenPriceBySymbol", {
        symbols: ["ETH", "BTC"],
      });
      assert.ok(data, "Should return price data");
    });

    it("fetchTokenPriceByAddress", { timeout: TIMEOUT }, async () => {
      const data = await callTool("fetchTokenPriceByAddress", {
        addresses: [{ address: USDC_ETH, network: "eth-mainnet" }],
      });
      assert.ok(data, "Should return price data");
    });

    it("fetchTokenPriceHistoryBySymbol", { timeout: TIMEOUT }, async () => {
      const data = await callTool("fetchTokenPriceHistoryBySymbol", {
        symbol: "ETH",
        startTime: "2025-01-01",
        endTime: "2025-01-07",
        interval: "1d",
      });
      assert.ok(data, "Should return price history");
    });

    it("fetchTokenPriceHistoryByTimeFrame", { timeout: TIMEOUT }, async () => {
      const data = await callTool("fetchTokenPriceHistoryByTimeFrame", {
        symbol: "ETH",
        timeFrame: "last-week",
        interval: "1d",
      });
      assert.ok(data, "Should return price history");
    });
  });

  // ========================================
  // MultiChain Token API
  // ========================================

  describe("MultiChain Token API", () => {
    it(
      "fetchTokensOwnedByMultichainAddresses",
      { timeout: TIMEOUT },
      async () => {
        const data = await callTool("fetchTokensOwnedByMultichainAddresses", {
          addresses: [
            {
              address: VITALIK,
              networks: ["eth-mainnet", "base-mainnet"],
            },
          ],
        });
        assert.ok(data, "Should return token data");
      },
    );
  });

  // ========================================
  // MultiChain Transaction History API
  // ========================================

  describe("MultiChain Transaction History API", () => {
    it("fetchAddressTransactionHistory", { timeout: TIMEOUT }, async () => {
      const data = await callTool("fetchAddressTransactionHistory", {
        addresses: [{ address: VITALIK, networks: ["eth-mainnet"] }],
        limit: 5,
      });
      assert.ok(data, "Should return transaction history");
    });
  });

  // ========================================
  // Transfers API
  // ========================================

  describe("Transfers API", () => {
    it("fetchTransfers", { timeout: TIMEOUT }, async () => {
      const data = await callTool("fetchTransfers", {
        fromAddress: VITALIK,
        network: "eth-mainnet",
        category: ["external"],
        maxCount: "0x5",
      });
      assert.ok(data, "Should return transfer data");
    });
  });

  // ========================================
  // NFT API (multichain)
  // ========================================

  describe("NFT API (multichain)", () => {
    it(
      "fetchNftsOwnedByMultichainAddresses",
      { timeout: TIMEOUT },
      async () => {
        const data = await callTool("fetchNftsOwnedByMultichainAddresses", {
          addresses: [
            {
              address: VITALIK,
              networks: ["eth-mainnet"],
            },
          ],
          pageSize: 5,
        });
        assert.ok(data, "Should return NFT data");
      },
    );

    it(
      "fetchNftContractDataByMultichainAddress",
      { timeout: TIMEOUT },
      async () => {
        const data = await callTool("fetchNftContractDataByMultichainAddress", {
          addresses: [{ address: VITALIK, networks: ["eth-mainnet"] }],
        });
        assert.ok(data, "Should return NFT contract data");
      },
    );
  });

  // ========================================
  // NFT V3 API (single-chain)
  // ========================================

  describe("NFT V3 API", () => {
    it("getNFTsForOwner", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getNFTsForOwner", {
        network: "eth-mainnet",
        owner: VITALIK,
        pageSize: 5,
      });
      assert.ok(data.ownedNfts !== undefined, "Should have ownedNfts");
    });

    it("getNFTsForContract", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getNFTsForContract", {
        network: "eth-mainnet",
        contractAddress: BAYC,
        limit: 5,
      });
      assert.ok(data.nfts !== undefined, "Should have nfts");
    });

    it("getNFTMetadata", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getNFTMetadata", {
        network: "eth-mainnet",
        contractAddress: BAYC,
        tokenId: "1",
      });
      assert.ok(data.contract !== undefined, "Should have contract field");
    });

    it("getContractMetadata", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getContractMetadata", {
        network: "eth-mainnet",
        contractAddress: BAYC,
      });
      assert.ok(
        data.name !== undefined || data.address !== undefined,
        "Should have metadata",
      );
    });

    it("getOwnersForNFT", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getOwnersForNFT", {
        network: "eth-mainnet",
        contractAddress: BAYC,
        tokenId: "1",
      });
      assert.ok(data.owners !== undefined, "Should have owners");
    });

    it("getOwnersForContract", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getOwnersForContract", {
        network: "eth-mainnet",
        contractAddress: BAYC,
      });
      assert.ok(
        data.ownerAddresses !== undefined || data.owners !== undefined,
        "Should have owner data",
      );
    });

    it("getSpamContracts", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getSpamContracts", {
        network: "eth-mainnet",
      });
      assert.ok(Array.isArray(data), "Should return an array");
    });

    it("isSpamContract", { timeout: TIMEOUT }, async () => {
      const data = await callTool("isSpamContract", {
        network: "eth-mainnet",
        contractAddress: BAYC,
      });
      // BAYC is not spam
      assert.ok(data !== undefined, "Should return a result");
    });

    it("isAirdropNFT", { timeout: TIMEOUT }, async () => {
      const data = await callTool("isAirdropNFT", {
        network: "eth-mainnet",
        contractAddress: BAYC,
        tokenId: "1",
      });
      assert.ok(data !== undefined, "Should return a result");
    });

    it("summarizeNFTAttributes", { timeout: TIMEOUT }, async () => {
      const data = await callTool("summarizeNFTAttributes", {
        network: "eth-mainnet",
        contractAddress: BAYC,
      });
      assert.ok(data, "Should return attribute summary");
    });

    it("getFloorPrice", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getFloorPrice", {
        network: "eth-mainnet",
        contractAddress: BAYC,
      });
      assert.ok(data, "Should return floor price data");
    });

    it("searchContractMetadata", { timeout: TIMEOUT }, async () => {
      const data = await callTool("searchContractMetadata", {
        network: "eth-mainnet",
        query: "bored ape",
      });
      assert.ok(data, "Should return search results");
    });

    it("isHolderOfContract", { timeout: TIMEOUT }, async () => {
      const data = await callTool("isHolderOfContract", {
        network: "eth-mainnet",
        wallet: VITALIK,
        contractAddress: BAYC,
      });
      assert.ok(data !== undefined, "Should return holder status");
    });

    it("computeRarity", { timeout: TIMEOUT }, async () => {
      const data = await callTool("computeRarity", {
        network: "eth-mainnet",
        contractAddress: BAYC,
        tokenId: "1",
      });
      assert.ok(data, "Should return rarity data");
    });

    it("getNFTSales", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getNFTSales", {
        network: "eth-mainnet",
        contractAddress: BAYC,
        limit: 5,
      });
      assert.ok(data.nftSales !== undefined, "Should have nftSales field");
    });

    it("getContractsForOwner", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getContractsForOwner", {
        network: "eth-mainnet",
        owner: VITALIK,
        pageSize: 5,
      });
      assert.ok(data.contracts !== undefined, "Should have contracts field");
    });

    it("getCollectionsForOwner", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getCollectionsForOwner", {
        network: "eth-mainnet",
        owner: VITALIK,
        pageSize: 5,
      });
      assert.ok(
        data.collections !== undefined,
        "Should have collections field",
      );
    });
  });

  // ========================================
  // Token API (JSON-RPC)
  // ========================================

  describe("Token API", () => {
    it("getTokenAllowance", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getTokenAllowance", {
        network: "eth-mainnet",
        contract: USDC_ETH,
        owner: VITALIK,
        spender: "0x0000000000000000000000000000000000000001",
      });
      assert.ok(data, "Should return allowance data");
    });

    it("getTokenBalances", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getTokenBalances", {
        network: "eth-mainnet",
        address: VITALIK,
      });
      assert.ok(data, "Should return token balances");
    });

    it("getTokenMetadata", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getTokenMetadata", {
        network: "eth-mainnet",
        contractAddress: USDC_ETH,
      });
      assert.ok(data, "Should return token metadata");
    });
  });

  // ========================================
  // Transaction Receipt API
  // ========================================

  describe("Transaction Receipt API", () => {
    it("getTransactionReceipts", { timeout: TIMEOUT }, async () => {
      // Use a known early block (block 1) for small payload
      const data = await callTool("getTransactionReceipts", {
        network: "eth-mainnet",
        blockNumber: "0x1",
      });
      assert.ok(data, "Should return receipt data");
    });
  });

  // ========================================
  // Debug API
  // ========================================

  describe("Debug API", () => {
    it("debugGetRawBlock", { timeout: TIMEOUT }, async () => {
      const data = await callTool("debugGetRawBlock", {
        network: "eth-mainnet",
        blockNumberOrTag: "latest",
      });
      assert.ok(data, "Should return raw block");
    });

    it("debugGetRawHeader", { timeout: TIMEOUT }, async () => {
      const data = await callTool("debugGetRawHeader", {
        network: "eth-mainnet",
        blockNumberOrTag: "latest",
      });
      assert.ok(data, "Should return raw header");
    });

    it("debugGetRawReceipts", { timeout: TIMEOUT }, async () => {
      const data = await callTool("debugGetRawReceipts", {
        network: "eth-mainnet",
        blockNumberOrTag: "0x1",
      });
      assert.ok(data, "Should return raw receipts");
    });

    it("debugTraceBlockByNumber", { timeout: TIMEOUT }, async () => {
      const data = await callTool("debugTraceBlockByNumber", {
        network: "eth-mainnet",
        blockNumberOrTag: "0x1",
      });
      assert.ok(data, "Should return trace data");
    });

    it("debugTraceTransaction", { timeout: TIMEOUT }, async () => {
      const data = await callTool("debugTraceTransaction", {
        network: "eth-mainnet",
        transactionHash: KNOWN_TX,
        options: { tracer: "callTracer" },
      });
      assert.ok(data, "Should return trace data");
    });
  });

  // ========================================
  // Trace API
  // ========================================

  describe("Trace API", () => {
    it("traceBlock", { timeout: TIMEOUT }, async () => {
      const data = await callTool("traceBlock", {
        network: "eth-mainnet",
        blockIdentifier: "0x1",
      });
      assert.ok(data, "Should return block traces");
    });

    it("traceTransaction", { timeout: TIMEOUT }, async () => {
      const data = await callTool("traceTransaction", {
        network: "eth-mainnet",
        transactionHash: KNOWN_TX,
      });
      assert.ok(data, "Should return transaction traces");
    });

    it("traceFilter", { timeout: TIMEOUT }, async () => {
      const data = await callTool("traceFilter", {
        network: "eth-mainnet",
        fromBlock: "0x1",
        toBlock: "0x5",
        count: 5,
      });
      assert.ok(data, "Should return filtered traces");
    });
  });

  // ========================================
  // Transaction Simulation API
  // ========================================

  describe("Transaction Simulation API", () => {
    it("simulateAssetChanges", { timeout: TIMEOUT }, async () => {
      const data = await callTool("simulateAssetChanges", {
        network: "eth-mainnet",
        transaction: {
          from: VITALIK,
          to: "0x0000000000000000000000000000000000000001",
          value: "0x0",
        },
      });
      assert.ok(data, "Should return simulation result");
    });

    it("simulateExecution", { timeout: TIMEOUT }, async () => {
      const data = await callTool("simulateExecution", {
        network: "eth-mainnet",
        transaction: {
          from: VITALIK,
          to: "0x0000000000000000000000000000000000000001",
          value: "0x0",
        },
      });
      assert.ok(data, "Should return simulation result");
    });
  });

  // ========================================
  // Bundler API
  // ========================================

  describe("Bundler API", () => {
    it("getMaxPriorityFeePerGas", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getMaxPriorityFeePerGas", {
        network: "eth-mainnet",
      });
      assert.ok(data, "Should return fee data");
    });

    it("getSupportedEntryPoints", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getSupportedEntryPoints", {
        network: "eth-mainnet",
      });
      assert.ok(data, "Should return entry points");
    });
  });

  // ========================================
  // Beacon API
  // ========================================

  describe("Beacon API", () => {
    it("getBeaconGenesis", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getBeaconGenesis", {
        network: "eth-mainnet",
      });
      assert.ok(data?.data, "Should have data field");
    });

    it("getBeaconBlock", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getBeaconBlock", {
        network: "eth-mainnet",
        blockId: "head",
      });
      assert.ok(data?.data, "Should have data field");
    });

    it("getBeaconBlockRoot", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getBeaconBlockRoot", {
        network: "eth-mainnet",
        blockId: "head",
      });
      assert.ok(data?.data, "Should have data field");
    });

    it("getBeaconHeaders", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getBeaconHeaders", {
        network: "eth-mainnet",
      });
      assert.ok(data?.data, "Should have data field");
    });

    it("getBeaconNodeSyncing", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getBeaconNodeSyncing", {
        network: "eth-mainnet",
      });
      assert.ok(data?.data !== undefined, "Should have data field");
    });

    it("getBeaconNodeVersion", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getBeaconNodeVersion", {
        network: "eth-mainnet",
      });
      assert.ok(data?.data, "Should have data field");
    });

    it("getBeaconConfigSpec", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getBeaconConfigSpec", {
        network: "eth-mainnet",
      });
      assert.ok(data?.data, "Should have data field");
    });

    it("getBeaconStateFork", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getBeaconStateFork", {
        network: "eth-mainnet",
        stateId: "head",
      });
      assert.ok(data?.data, "Should have data field");
    });

    it("getBeaconStateFinalityCheckpoints", { timeout: TIMEOUT }, async () => {
      const data = await callTool("getBeaconStateFinalityCheckpoints", {
        network: "eth-mainnet",
        stateId: "head",
      });
      assert.ok(data?.data, "Should have data field");
    });
  });

  // ========================================
  // Solana DAS API
  // ========================================

  describe("Solana DAS API", () => {
    it("solanaGetAsset", { timeout: TIMEOUT }, async () => {
      const data = await callTool("solanaGetAsset", {
        network: "solana-mainnet",
        id: BONK,
      });
      assert.ok(data, "Should return asset data");
    });

    it("solanaGetAssets", { timeout: TIMEOUT }, async () => {
      const data = await callTool("solanaGetAssets", {
        network: "solana-mainnet",
        ids: [BONK],
      });
      assert.ok(data, "Should return assets data");
    });

    it("solanaGetAssetsByOwner", { timeout: TIMEOUT }, async () => {
      const data = await callTool("solanaGetAssetsByOwner", {
        network: "solana-mainnet",
        ownerAddress: SOL_WALLET,
        limit: 5,
      });
      assert.ok(data, "Should return assets by owner");
    });

    it("solanaGetTokenAccounts", { timeout: TIMEOUT }, async () => {
      const data = await callTool("solanaGetTokenAccounts", {
        network: "solana-mainnet",
        ownerAddress: SOL_WALLET,
        limit: 5,
      });
      assert.ok(data, "Should return token accounts");
    });

    it("solanaSearchAssets", { timeout: TIMEOUT }, async () => {
      const data = await callTool("solanaSearchAssets", {
        network: "solana-mainnet",
        ownerAddress: SOL_WALLET,
        limit: 5,
      });
      assert.ok(data, "Should return search results");
    });
  });

  // ========================================
  // Multi-Network Tests
  // ========================================

  describe("Multi-Network Tests", () => {
    for (const network of ["eth-mainnet", "base-mainnet", "polygon-mainnet"]) {
      it(`getTokenBalances on ${network}`, { timeout: TIMEOUT }, async () => {
        const data = await callTool("getTokenBalances", {
          network,
          address: VITALIK,
        });
        assert.ok(data, `Should return balances on ${network}`);
      });
    }

    for (const network of ["eth-mainnet", "base-mainnet"]) {
      it(`getNFTsForOwner on ${network}`, { timeout: TIMEOUT }, async () => {
        const data = await callTool("getNFTsForOwner", {
          network,
          owner: VITALIK,
          pageSize: 5,
        });
        assert.ok(
          data.ownedNfts !== undefined,
          `Should have ownedNfts on ${network}`,
        );
      });
    }
  });
});
