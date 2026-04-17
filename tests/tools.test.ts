import "reflect-metadata";

import assert from "node:assert";
import { describe, it } from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { AlchemyApi } from "../api/alchemyApi.js";
import {
  BeaconClientProvider,
  JsonRpcClientProvider,
  NftV3ClientProvider,
} from "../api/client-providers.js";
import { registerTools } from "../api/registerTools.js";
import { setupDi } from "../di/di-container.js";
import { ClientsModule } from "../di/modules/clients.module.js";

// ========================================
// Expected tool names — the canonical list
// ========================================

const EXPECTED_TOOLS = [
  // Network Discovery
  "listSupportedNetworks",
  // Prices API
  "fetchTokenPriceBySymbol",
  "fetchTokenPriceByAddress",
  "fetchTokenPriceHistoryBySymbol",
  "fetchTokenPriceHistoryByTimeFrame",
  // MultiChain Token API
  "fetchTokensOwnedByMultichainAddresses",
  // MultiChain Transaction History API
  "fetchAddressTransactionHistory",
  // Transfers API
  "fetchTransfers",
  // NFT API (multichain)
  "fetchNftsOwnedByMultichainAddresses",
  "fetchNftContractDataByMultichainAddress",
  // Wallet API
  "sendTransaction",
  // Swap API
  "swap",
  // NFT V3 API (single-chain GET endpoints)
  "getNFTsForOwner",
  "getNFTsForContract",
  "getNFTsForCollection",
  "getNFTMetadata",
  "getContractMetadata",
  "getCollectionMetadata",
  "invalidateNFTContractCache",
  "getOwnersForNFT",
  "getOwnersForContract",
  "getSpamContracts",
  "isSpamContract",
  "isAirdropNFT",
  "summarizeNFTAttributes",
  "getFloorPrice",
  "searchContractMetadata",
  "isHolderOfContract",
  "computeRarity",
  "getNFTSales",
  "getContractsForOwner",
  "getCollectionsForOwner",
  "reportSpam",
  // Token API (JSON-RPC)
  "getTokenAllowance",
  "getTokenBalances",
  "getTokenMetadata",
  // Transaction Receipt API (JSON-RPC)
  "getTransactionReceipts",
  // Debug API (JSON-RPC)
  "debugGetRawBlock",
  "debugGetRawHeader",
  "debugGetRawReceipts",
  "debugTraceBlockByHash",
  "debugTraceBlockByNumber",
  "debugTraceCall",
  "debugTraceTransaction",
  // Trace API (JSON-RPC)
  "traceBlock",
  "traceCall",
  "traceGet",
  "traceRawTransaction",
  "traceReplayBlockTransactions",
  "traceReplayTransaction",
  "traceTransaction",
  "traceFilter",
  // Transaction Simulation API (JSON-RPC)
  "simulateAssetChanges",
  "simulateAssetChangesBundle",
  "simulateExecution",
  "simulateExecutionBundle",
  // Bundler API (JSON-RPC)
  "getMaxPriorityFeePerGas",
  "getUserOperationReceipt",
  "getSupportedEntryPoints",
  "getUserOperationByHash",
  "estimateUserOperationGas",
  // UserOp Simulation API (JSON-RPC)
  "simulateUserOperationAssetChanges",
  // Beacon API (REST GET)
  "getBeaconGenesis",
  "getBeaconBlock",
  "getBeaconBlockAttestations",
  "getBeaconBlockRoot",
  "getBeaconBlobSidecars",
  "getBeaconHeaders",
  "getBeaconHeaderByBlockId",
  "getBeaconPoolVoluntaryExits",
  "getBeaconPoolAttestations",
  "getBeaconStateCommittees",
  "getBeaconStateFinalityCheckpoints",
  "getBeaconStateFork",
  "getBeaconStatePendingConsolidations",
  "getBeaconStateRoot",
  "getBeaconStateSyncCommittees",
  "getBeaconStateRandao",
  "getBeaconStateValidatorBalances",
  "getBeaconStateValidators",
  "getBeaconStateValidatorById",
  "getBeaconBlockRewards",
  "getBeaconConfigSpec",
  "getBeaconNodeSyncing",
  "getBeaconNodeVersion",
  // Solana DAS API (JSON-RPC)
  "solanaGetAsset",
  "solanaGetAssets",
  "solanaGetAssetProof",
  "solanaGetAssetProofs",
  "solanaGetAssetsByAuthority",
  "solanaGetAssetsByCreator",
  "solanaGetAssetsByGroup",
  "solanaGetAssetsByOwner",
  "solanaGetAssetSignatures",
  "solanaGetNftEditions",
  "solanaGetTokenAccounts",
  "solanaSearchAssets",
].sort();

// ========================================
// DI Container Tests
// ========================================

describe("DI Container", () => {
  it("should bootstrap with all bindings resolved", () => {
    const container = setupDi([new ClientsModule()]);

    const api = container.get(AlchemyApi);
    assert.ok(
      api instanceof AlchemyApi,
      "AlchemyApi should be an instance of AlchemyApi",
    );

    const jsonRpc = container.get(JsonRpcClientProvider);
    assert.ok(jsonRpc instanceof JsonRpcClientProvider);
  });

  it("should return singletons for AlchemyApi", () => {
    const container = setupDi([new ClientsModule()]);
    const api1 = container.get(AlchemyApi);
    const api2 = container.get(AlchemyApi);
    assert.strictEqual(api1, api2, "AlchemyApi should be a singleton");
  });

  it("should return singletons for client providers", () => {
    const container = setupDi([new ClientsModule()]);
    const p1 = container.get(JsonRpcClientProvider);
    const p2 = container.get(JsonRpcClientProvider);
    assert.strictEqual(p1, p2, "JsonRpcClientProvider should be a singleton");
  });
});

// ========================================
// Client Provider Tests
// ========================================

describe("Client Providers", () => {
  it("JsonRpcClientProvider should cache clients by network", () => {
    const container = setupDi([new ClientsModule()]);
    const provider = container.get(JsonRpcClientProvider);

    const client1 = provider.get("eth-mainnet");
    const client2 = provider.get("eth-mainnet");
    const client3 = provider.get("base-mainnet");

    assert.strictEqual(
      client1,
      client2,
      "Same network should return cached client",
    );
    assert.notStrictEqual(
      client1,
      client3,
      "Different networks should return different clients",
    );
  });

  it("JsonRpcClientProvider should use correct base URL pattern", () => {
    const container = setupDi([new ClientsModule()]);
    const provider = container.get(JsonRpcClientProvider);
    const client = provider.get("eth-mainnet");
    const baseURL = (client.defaults as any).baseURL as string;
    assert.ok(
      baseURL.includes("eth-mainnet.g.alchemy.com/v2/"),
      `Base URL should contain network: ${baseURL}`,
    );
  });

  it("NftV3ClientProvider should cache clients by network", () => {
    const container = setupDi([new ClientsModule()]);
    const provider = container.get(NftV3ClientProvider);

    const client1 = provider.get("eth-mainnet");
    const client2 = provider.get("eth-mainnet");
    const client3 = provider.get("base-mainnet");

    assert.strictEqual(
      client1,
      client2,
      "Same network should return cached client",
    );
    assert.notStrictEqual(
      client1,
      client3,
      "Different networks should return different clients",
    );
  });

  it("NftV3ClientProvider should use correct base URL pattern", () => {
    const container = setupDi([new ClientsModule()]);
    const provider = container.get(NftV3ClientProvider);
    const client = provider.get("eth-mainnet");
    const baseURL = (client.defaults as any).baseURL as string;
    assert.ok(
      baseURL.includes("eth-mainnet.g.alchemy.com/nft/v3/"),
      `Base URL should contain NFT v3 path: ${baseURL}`,
    );
  });

  it("BeaconClientProvider should cache clients by network", () => {
    const container = setupDi([new ClientsModule()]);
    const provider = container.get(BeaconClientProvider);

    const client1 = provider.get("eth-mainnet");
    const client2 = provider.get("eth-mainnet");
    const client3 = provider.get("eth-sepolia");

    assert.strictEqual(
      client1,
      client2,
      "Same network should return cached client",
    );
    assert.notStrictEqual(
      client1,
      client3,
      "Different networks should return different clients",
    );
  });

  it("BeaconClientProvider should use correct base URL pattern", () => {
    const container = setupDi([new ClientsModule()]);
    const provider = container.get(BeaconClientProvider);
    const client = provider.get("eth-mainnet");
    const baseURL = (client.defaults as any).baseURL as string;
    assert.ok(
      baseURL.includes("eth-mainnetbeacon.g.alchemy.com/v2/"),
      `Base URL should contain beacon path: ${baseURL}`,
    );
  });
});

// ========================================
// MCP Tool Registration Tests
// ========================================

describe("MCP Tool Registration", () => {
  it("should register all expected tools", async () => {
    const container = setupDi([new ClientsModule()]);
    const alchemyApi = container.get(AlchemyApi);

    const server = new McpServer({
      name: "test-server",
      version: "0.0.1",
    });

    registerTools(server, alchemyApi);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "0.0.1" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.listTools();
    const registeredNames = result.tools.map((t: any) => t.name).sort();

    assert.strictEqual(
      registeredNames.length,
      EXPECTED_TOOLS.length,
      `Expected ${EXPECTED_TOOLS.length} tools, got ${registeredNames.length}.\n` +
        `Missing: ${EXPECTED_TOOLS.filter((t) => !registeredNames.includes(t)).join(", ")}\n` +
        `Extra: ${registeredNames.filter((t: string) => !EXPECTED_TOOLS.includes(t)).join(", ")}`,
    );

    for (const toolName of EXPECTED_TOOLS) {
      assert.ok(
        registeredNames.includes(toolName),
        `Missing tool: ${toolName}`,
      );
    }

    for (const toolName of registeredNames) {
      assert.ok(
        EXPECTED_TOOLS.includes(toolName),
        `Unexpected tool: ${toolName}`,
      );
    }

    await client.close();
    await server.close();
  });

  it("every tool should have an inputSchema", async () => {
    const container = setupDi([new ClientsModule()]);
    const alchemyApi = container.get(AlchemyApi);

    const server = new McpServer({
      name: "test-server",
      version: "0.0.1",
    });

    registerTools(server, alchemyApi);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "0.0.1" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.listTools();

    for (const tool of result.tools) {
      assert.ok(
        tool.inputSchema !== undefined && tool.inputSchema !== null,
        `Tool "${tool.name}" should have an inputSchema`,
      );
      assert.strictEqual(
        tool.inputSchema.type,
        "object",
        `Tool "${tool.name}" inputSchema.type should be "object"`,
      );
    }

    await client.close();
    await server.close();
  });

  // Required for ChatGPT App Directory submission. See
  // https://developers.openai.com/apps-sdk/deploy/submission/ — missing or
  // mismatched tool hint annotations are a stated rejection reason.
  it("every tool should declare readOnlyHint, destructiveHint, and openWorldHint annotations", async () => {
    const container = setupDi([new ClientsModule()]);
    const alchemyApi = container.get(AlchemyApi);

    const server = new McpServer({
      name: "test-server",
      version: "0.0.1",
    });

    registerTools(server, alchemyApi);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "0.0.1" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.listTools();

    for (const tool of result.tools) {
      const annotations = tool.annotations;
      assert.ok(
        annotations,
        `Tool "${tool.name}" must declare annotations (readOnlyHint, destructiveHint, openWorldHint)`,
      );
      assert.strictEqual(
        typeof annotations.readOnlyHint,
        "boolean",
        `Tool "${tool.name}" must declare readOnlyHint as a boolean`,
      );
      assert.strictEqual(
        typeof annotations.destructiveHint,
        "boolean",
        `Tool "${tool.name}" must declare destructiveHint as a boolean`,
      );
      assert.strictEqual(
        typeof annotations.openWorldHint,
        "boolean",
        `Tool "${tool.name}" must declare openWorldHint as a boolean`,
      );
    }

    await client.close();
    await server.close();
  });

  // Sanity check: the four known state-changing tools must NOT be marked read-only.
  // Catches regressions where someone copies a read-only template onto a new write tool.
  it("known state-changing tools must not be marked read-only", async () => {
    const container = setupDi([new ClientsModule()]);
    const alchemyApi = container.get(AlchemyApi);

    const server = new McpServer({
      name: "test-server",
      version: "0.0.1",
    });

    registerTools(server, alchemyApi);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "0.0.1" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.listTools();

    const STATE_CHANGING = [
      "sendTransaction",
      "swap",
      "reportSpam",
      "invalidateNFTContractCache",
    ];

    for (const name of STATE_CHANGING) {
      const tool = result.tools.find((t) => t.name === name);
      assert.ok(tool, `Expected tool "${name}" to be registered`);
      assert.strictEqual(
        tool.annotations?.readOnlyHint,
        false,
        `Tool "${name}" mutates state and must have readOnlyHint: false`,
      );
    }

    // sendTransaction and swap are both irreversible blockchain writes — must be destructive.
    for (const name of ["sendTransaction", "swap"]) {
      const tool = result.tools.find((t) => t.name === name);
      assert.ok(tool, `Expected tool "${name}" to be registered`);
      assert.strictEqual(
        tool.annotations?.destructiveHint,
        true,
        `Tool "${name}" performs irreversible blockchain writes and must have destructiveHint: true`,
      );
      assert.strictEqual(
        tool.annotations?.openWorldHint,
        true,
        `Tool "${name}" writes to public blockchain state and must have openWorldHint: true`,
      );
    }

    await client.close();
    await server.close();
  });
});
