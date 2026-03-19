import "reflect-metadata";

import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";

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

    // NFT V3 API mocks
    getNFTsForOwner: async () => ({
      ownedNfts: [
        {
          contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
          tokenId: "1234",
          name: "Bored Ape #1234",
        },
      ],
      totalCount: 1,
      pageKey: null,
    }),

    getNFTsForContract: async () => ({
      nfts: [
        {
          contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
          tokenId: "1",
          name: "Bored Ape #1",
        },
      ],
      pageKey: null,
    }),

    getNFTsForCollection: async () => ({
      nfts: [
        {
          contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
          tokenId: "1",
          name: "Bored Ape #1",
        },
      ],
      nextToken: null,
    }),

    getNFTMetadata: async () => ({
      contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
      tokenId: "1234",
      name: "Bored Ape #1234",
      description: "A Bored Ape",
      tokenType: "ERC721",
    }),

    getContractMetadata: async () => ({
      address: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
      name: "BoredApeYachtClub",
      symbol: "BAYC",
      tokenType: "ERC721",
      totalSupply: "10000",
    }),

    getCollectionMetadata: async () => ({
      collectionSlug: "boredapeyachtclub",
      name: "Bored Ape Yacht Club",
      description: "BAYC collection",
    }),

    invalidateContract: async () => ({
      success: true,
      numTokensInvalidated: 10000,
    }),

    getOwnersForNFT: async () => ({
      owners: ["0xaaa", "0xbbb"],
      pageKey: null,
    }),

    getOwnersForContract: async () => ({
      owners: [
        {
          ownerAddress: "0xaaa",
          tokenBalances: [{ tokenId: "1", balance: "1" }],
        },
      ],
    }),

    getSpamContracts: async () => ({
      contractAddresses: ["0xspam1", "0xspam2"],
    }),

    isSpamContract: async () => ({
      isSpamContract: false,
    }),

    isAirdropNFT: async () => ({
      isAirdrop: false,
    }),

    summarizeNFTAttributes: async () => ({
      totalSupply: "10000",
      summary: { Background: { Blue: 1000, Red: 2000 } },
      contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
    }),

    getFloorPrice: async () => ({
      openSea: {
        floorPrice: 30.5,
        priceCurrency: "ETH",
        collectionUrl: "https://opensea.io/collection/boredapeyachtclub",
      },
      looksRare: {
        floorPrice: 31.0,
        priceCurrency: "ETH",
        collectionUrl:
          "https://looksrare.org/collections/0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
      },
    }),

    searchContractMetadata: async () => [
      {
        address: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        name: "BoredApeYachtClub",
        symbol: "BAYC",
      },
    ],

    isHolderOfContract: async () => ({
      isHolderOfContract: true,
    }),

    computeRarity: async () => ({
      rarities: [
        { trait_type: "Background", value: "Blue", prevalence: 0.12 },
        { trait_type: "Fur", value: "Gold", prevalence: 0.05 },
      ],
    }),

    getNFTSales: async () => ({
      nftSales: [
        {
          marketplace: "seaport",
          contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
          tokenId: "1234",
          buyerAddress: "0xbuyer",
          sellerAddress: "0xseller",
          transactionHash: "0xtxhash",
        },
      ],
      pageKey: null,
    }),

    getContractsForOwner: async () => ({
      contracts: [
        {
          address: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
          name: "BoredApeYachtClub",
          totalBalance: "3",
        },
      ],
      pageKey: null,
      totalCount: 1,
    }),

    getCollectionsForOwner: async () => ({
      collections: [
        {
          collectionSlug: "boredapeyachtclub",
          name: "Bored Ape Yacht Club",
          totalBalance: "3",
        },
      ],
      pageKey: null,
      totalCount: 1,
    }),

    reportSpam: async () => "Address was successfully reported as spam",

    // Token API mocks
    getTokenAllowance: async () => ({
      result: "0",
    }),

    getTokenBalances: async () => ({
      result: {
        address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        tokenBalances: [
          {
            contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            tokenBalance:
              "0x00000000000000000000000000000000000000000000000000000000000f4240",
          },
        ],
      },
    }),

    getTokenMetadata: async () => ({
      result: {
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
        logo: "https://static.alchemyapi.io/images/assets/3408.png",
      },
    }),

    // Transaction Receipt API mocks
    getTransactionReceipts: async () => ({
      result: {
        receipts: [
          {
            blockHash:
              "0x18760312114f3fdf11f9d5846245995835aa59994d5fc4203faee52d2f7eaabe",
            blockNumber: "0xF1D1C6",
            transactionHash:
              "0x4c32db860a0b1fd4514b94c2c75a76d4924cebaebd62d2f622105e0fc863cfb2",
            from: "0x0049d82d5a59bbdb24fe2e8eb4733ecf20df1886",
            to: "0x66c4289252b6f1d8d7b241495e60f93c2820c9b1",
            status: 1,
          },
        ],
      },
    }),

    // Debug API mocks
    debugGetRawBlock: async () => ({ result: "0xrlpdata" }),
    debugGetRawHeader: async () => ({ result: "0xrlpheader" }),
    debugGetRawReceipts: async () => ({ result: ["0xreceipt1", "0xreceipt2"] }),
    debugTraceBlockByHash: async () => ({
      result: [{ type: "call", from: "0xaaa", to: "0xbbb" }],
    }),
    debugTraceBlockByNumber: async () => ({
      result: [{ type: "call", from: "0xaaa", to: "0xbbb" }],
    }),
    debugTraceCall: async () => ({
      result: { type: "call", from: "0xaaa", to: "0xbbb", gas: "0x5208" },
    }),
    debugTraceTransaction: async () => ({
      result: { type: "call", from: "0xaaa", to: "0xbbb", gas: "0x5208" },
    }),

    // Trace API mocks
    traceBlock: async () => ({
      result: [
        {
          action: { callType: "call", from: "0xaaa", to: "0xbbb" },
          type: "call",
        },
      ],
    }),
    traceCall: async () => ({
      result: {
        output: "0x",
        trace: [{ action: { callType: "call" }, type: "call" }],
      },
    }),
    traceGet: async () => ({
      result: { action: { callType: "call", from: "0xaaa" }, type: "call" },
    }),
    traceRawTransaction: async () => ({ result: { output: "0x", trace: [] } }),
    traceReplayBlockTransactions: async () => ({
      result: [{ transactionHash: "0xabc", trace: [] }],
    }),
    traceReplayTransaction: async () => ({
      result: { output: "0x", trace: [] },
    }),
    traceTransaction: async () => ({
      result: [{ action: { callType: "call" }, type: "call" }],
    }),
    traceFilter: async () => ({
      result: [
        { action: { callType: "call", from: "0xaaa" }, blockNumber: "0x1" },
      ],
    }),

    // Transaction Simulation mocks
    simulateAssetChanges: async () => ({
      result: {
        changes: [
          { assetType: "ERC20", changeType: "TRANSFER", amount: "100" },
        ],
      },
    }),
    simulateAssetChangesBundle: async () => ({ result: [{ changes: [] }] }),
    simulateExecution: async () => ({
      result: {
        calls: [{ type: "CALL", from: "0xaaa", to: "0xbbb" }],
        logs: [],
      },
    }),
    simulateExecutionBundle: async () => ({
      result: [{ calls: [], logs: [] }],
    }),

    // Bundler API mocks
    getMaxPriorityFeePerGas: async () => ({ result: "0x5f5e100" }),
    getUserOperationReceipt: async () => ({
      result: { userOpHash: "0xabc", success: true, actualGasCost: "0x1234" },
    }),
    getSupportedEntryPoints: async () => ({
      result: ["0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"],
    }),
    getUserOperationByHash: async () => ({
      result: {
        sender: "0xaaa",
        nonce: "0x1",
        entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
      },
    }),
    estimateUserOperationGas: async () => ({
      result: {
        preVerificationGas: "0x1000",
        verificationGasLimit: "0x2000",
        callGasLimit: "0x3000",
      },
    }),

    // UserOp Simulation mocks
    simulateUserOperationAssetChanges: async () => ({
      result: {
        changes: [
          { assetType: "NATIVE", changeType: "TRANSFER", amount: "0.01" },
        ],
      },
    }),

    // Beacon API mocks
    getBeaconGenesis: async () => ({
      data: {
        genesis_time: "1606824023",
        genesis_validators_root:
          "0x4b363db94e286120d76eb905340fdd4e54bfe9f06bf33ff6cf5ad27f511bfe95",
      },
    }),
    getBeaconBlock: async () => ({
      data: { message: { slot: "1234", proposer_index: "5" } },
    }),
    getBeaconBlockAttestations: async () => ({
      data: [{ aggregation_bits: "0x01" }],
    }),
    getBeaconBlockRoot: async () => ({ data: { root: "0xabc123" } }),
    getBeaconBlobSidecars: async () => ({ data: [] }),
    getBeaconHeaders: async () => ({
      data: [{ root: "0xabc", header: { message: { slot: "1234" } } }],
    }),
    getBeaconHeaderByBlockId: async () => ({
      data: { root: "0xabc", header: { message: { slot: "1234" } } },
    }),
    getBeaconPoolVoluntaryExits: async () => ({ data: [] }),
    getBeaconPoolAttestations: async () => ({ data: [] }),
    getBeaconStateCommittees: async () => ({
      data: [{ index: "0", slot: "1234", validators: ["1", "2"] }],
    }),
    getBeaconStateFinalityCheckpoints: async () => ({
      data: { finalized: { epoch: "100", root: "0xabc" } },
    }),
    getBeaconStateFork: async () => ({
      data: {
        previous_version: "0x00000000",
        current_version: "0x01000000",
        epoch: "0",
      },
    }),
    getBeaconStatePendingConsolidations: async () => ({ data: [] }),
    getBeaconStateRoot: async () => ({ data: { root: "0xstateroot" } }),
    getBeaconStateSyncCommittees: async () => ({
      data: { validators: ["1", "2", "3"] },
    }),
    getBeaconStateRandao: async () => ({ data: { randao: "0xrandao123" } }),
    getBeaconStateValidatorBalances: async () => ({
      data: [{ index: "1", balance: "32000000000" }],
    }),
    getBeaconStateValidators: async () => ({
      data: [{ index: "1", status: "active_ongoing", balance: "32000000000" }],
    }),
    getBeaconStateValidatorById: async () => ({
      data: { index: "1", status: "active_ongoing", balance: "32000000000" },
    }),
    getBeaconBlockRewards: async () => ({
      data: { proposer_index: "5", total: "1000000", attestations: "900000" },
    }),
    getBeaconConfigSpec: async () => ({
      data: { SECONDS_PER_SLOT: "12", SLOTS_PER_EPOCH: "32" },
    }),
    getBeaconNodeSyncing: async () => ({
      data: { head_slot: "1234567", sync_distance: "0", is_syncing: false },
    }),
    getBeaconNodeVersion: async () => ({
      data: { version: "Lighthouse/v4.0.0" },
    }),

    // Solana DAS API mocks
    solanaGetAsset: async () => ({
      result: { id: "abc123", content: { name: "My NFT" } },
    }),
    solanaGetAssets: async () => ({
      result: [{ id: "abc123" }, { id: "def456" }],
    }),
    solanaGetAssetProof: async () => ({
      result: { root: "abc", proof: ["proof1"], leaf: "leaf1" },
    }),
    solanaGetAssetProofs: async () => ({
      result: [{ id: "abc123", root: "abc" }],
    }),
    solanaGetAssetsByAuthority: async () => ({
      result: { items: [{ id: "abc123" }], total: 1 },
    }),
    solanaGetAssetsByCreator: async () => ({
      result: { items: [{ id: "abc123" }], total: 1 },
    }),
    solanaGetAssetsByGroup: async () => ({
      result: { items: [{ id: "abc123" }], total: 1 },
    }),
    solanaGetAssetsByOwner: async () => ({
      result: { items: [{ id: "abc123" }], total: 1 },
    }),
    solanaGetAssetSignatures: async () => ({
      result: { items: [{ signature: "sig123" }], total: 1 },
    }),
    solanaGetNftEditions: async () => ({
      result: { items: [{ edition: 1 }], total: 1 },
    }),
    solanaGetTokenAccounts: async () => ({
      result: { items: [{ mint: "mint123", owner: "owner123" }], total: 1 },
    }),
    solanaSearchAssets: async () => ({
      result: { items: [{ id: "abc123" }], total: 1 },
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
  let client: Client;
  let server: McpServer;

  beforeEach(async () => {
    ({ client, server } = await setupTestClient());
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  it("fetchTokenPriceBySymbol returns price data", async () => {
    const result = await client.callTool({
      name: "fetchTokenPriceBySymbol",
      arguments: { symbols: ["ETH", "BTC"] },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.data, "Response should have data field");
    assert.strictEqual(data.data.length, 2, "Should return 2 prices");
    assert.strictEqual(data.data[0].symbol, "ETH");
    assert.strictEqual(data.data[1].price, "65000.00");
  });

  it("fetchTokenPriceByAddress returns price data", async () => {
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
  });

  it("fetchAddressTransactionHistory enriches transactions with date and ethValue", async () => {
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
  });

  it("fetchTokensOwnedByMultichainAddresses returns token data", async () => {
    const result = await client.callTool({
      name: "fetchTokensOwnedByMultichainAddresses",
      arguments: {
        addresses: [{ address: "0xaaa", networks: ["eth-mainnet"] }],
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.tokens, "Response should have tokens field");
    assert.strictEqual(data.tokens[0].address, "0xABC");
  });

  it("fetchTransfers returns transfer data", async () => {
    const result = await client.callTool({
      name: "fetchTransfers",
      arguments: {
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.result.transfers, "Response should have transfers");
    assert.strictEqual(data.result.transfers[0].asset, "ETH");
  });

  it("fetchNftsOwnedByMultichainAddresses returns NFT data", async () => {
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
  });

  it("sendTransaction returns transaction hash", async () => {
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
  });

  // ========================================
  // NFT V3 API Tests
  // ========================================

  it("getNFTsForOwner returns owned NFTs", async () => {
    const result = await client.callTool({
      name: "getNFTsForOwner",
      arguments: { owner: "0xaaa", network: "eth-mainnet" },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.ownedNfts, "Response should have ownedNfts field");
    assert.strictEqual(data.ownedNfts.length, 1);
    assert.strictEqual(data.totalCount, 1);
  });

  it("getNFTsForContract returns NFTs for a contract", async () => {
    const result = await client.callTool({
      name: "getNFTsForContract",
      arguments: {
        contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.nfts, "Response should have nfts field");
    assert.strictEqual(data.nfts.length, 1);
  });

  it("getNFTsForCollection returns NFTs for a collection", async () => {
    const result = await client.callTool({
      name: "getNFTsForCollection",
      arguments: {
        contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.nfts, "Response should have nfts field");
  });

  it("getNFTMetadata returns metadata for a specific NFT", async () => {
    const result = await client.callTool({
      name: "getNFTMetadata",
      arguments: {
        contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: "1234",
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.strictEqual(data.tokenId, "1234");
    assert.strictEqual(data.tokenType, "ERC721");
    assert.ok(data.name, "Response should have name field");
  });

  it("getContractMetadata returns contract-level metadata", async () => {
    const result = await client.callTool({
      name: "getContractMetadata",
      arguments: {
        contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.strictEqual(data.name, "BoredApeYachtClub");
    assert.strictEqual(data.symbol, "BAYC");
    assert.strictEqual(data.totalSupply, "10000");
  });

  it("getCollectionMetadata returns collection metadata", async () => {
    const result = await client.callTool({
      name: "getCollectionMetadata",
      arguments: {
        collectionSlug: "boredapeyachtclub",
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.strictEqual(data.collectionSlug, "boredapeyachtclub");
    assert.ok(data.name, "Response should have name field");
  });

  it("invalidateNFTContractCache returns invalidation result", async () => {
    const result = await client.callTool({
      name: "invalidateNFTContractCache",
      arguments: {
        contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.numTokensInvalidated, 10000);
  });

  it("getOwnersForNFT returns owners of a specific token", async () => {
    const result = await client.callTool({
      name: "getOwnersForNFT",
      arguments: {
        contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: "1234",
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.owners, "Response should have owners field");
    assert.strictEqual(data.owners.length, 2);
  });

  it("getOwnersForContract returns owners of a contract", async () => {
    const result = await client.callTool({
      name: "getOwnersForContract",
      arguments: {
        contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.owners, "Response should have owners field");
    assert.strictEqual(data.owners[0].ownerAddress, "0xaaa");
  });

  it("getSpamContracts returns list of spam contracts", async () => {
    const result = await client.callTool({
      name: "getSpamContracts",
      arguments: { network: "eth-mainnet" },
    });

    const data = parseToolResponse(result as never);
    assert.ok(
      data.contractAddresses,
      "Response should have contractAddresses field",
    );
    assert.strictEqual(data.contractAddresses.length, 2);
  });

  it("isSpamContract returns spam status", async () => {
    const result = await client.callTool({
      name: "isSpamContract",
      arguments: {
        contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.strictEqual(data.isSpamContract, false);
  });

  it("isAirdropNFT returns airdrop status", async () => {
    const result = await client.callTool({
      name: "isAirdropNFT",
      arguments: {
        contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: "1234",
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.strictEqual(data.isAirdrop, false);
  });

  it("summarizeNFTAttributes returns attribute summary", async () => {
    const result = await client.callTool({
      name: "summarizeNFTAttributes",
      arguments: {
        contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.strictEqual(data.totalSupply, "10000");
    assert.ok(data.summary, "Response should have summary field");
  });

  it("getFloorPrice returns marketplace floor prices", async () => {
    const result = await client.callTool({
      name: "getFloorPrice",
      arguments: {
        contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.openSea, "Response should have openSea field");
    assert.strictEqual(data.openSea.floorPrice, 30.5);
    assert.strictEqual(data.openSea.priceCurrency, "ETH");
  });

  it("searchContractMetadata returns matching contracts", async () => {
    const result = await client.callTool({
      name: "searchContractMetadata",
      arguments: {
        query: "bored ape",
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(Array.isArray(data), "Response should be an array");
    assert.strictEqual(data[0].name, "BoredApeYachtClub");
  });

  it("isHolderOfContract returns holder status", async () => {
    const result = await client.callTool({
      name: "isHolderOfContract",
      arguments: {
        wallet: "0xaaa",
        contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.strictEqual(data.isHolderOfContract, true);
  });

  it("computeRarity returns rarity data", async () => {
    const result = await client.callTool({
      name: "computeRarity",
      arguments: {
        contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
        tokenId: "1234",
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.rarities, "Response should have rarities field");
    assert.strictEqual(data.rarities.length, 2);
    assert.strictEqual(data.rarities[0].trait_type, "Background");
  });

  it("getNFTSales returns sales data", async () => {
    const result = await client.callTool({
      name: "getNFTSales",
      arguments: {
        network: "eth-mainnet",
        contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.nftSales, "Response should have nftSales field");
    assert.strictEqual(data.nftSales[0].marketplace, "seaport");
  });

  it("getContractsForOwner returns contracts owned by address", async () => {
    const result = await client.callTool({
      name: "getContractsForOwner",
      arguments: {
        owner: "0xaaa",
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.contracts, "Response should have contracts field");
    assert.strictEqual(data.totalCount, 1);
  });

  it("getCollectionsForOwner returns collections owned by address", async () => {
    const result = await client.callTool({
      name: "getCollectionsForOwner",
      arguments: {
        owner: "0xaaa",
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.collections, "Response should have collections field");
    assert.strictEqual(data.totalCount, 1);
  });

  it("reportSpam returns confirmation message", async () => {
    const result = await client.callTool({
      name: "reportSpam",
      arguments: {
        address: "0xspam",
        isSpam: true,
        network: "eth-mainnet",
      },
    });

    const data = parseToolResponse(result as never);
    assert.strictEqual(data, "Address was successfully reported as spam");
  });

  // ========================================
  // Token API Tests
  // ========================================

  it("getTokenAllowance returns allowance data", async () => {
    const result = await client.callTool({
      name: "getTokenAllowance",
      arguments: {
        network: "eth-mainnet",
        contract: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        owner: "0xf1a726210550c306a9964b251cbcd3fa5ecb275d",
        spender: "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.result !== undefined, "Response should have result field");
  });

  it("getTokenBalances returns token balance data", async () => {
    const result = await client.callTool({
      name: "getTokenBalances",
      arguments: {
        network: "eth-mainnet",
        address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.result, "Response should have result field");
    assert.ok(data.result.tokenBalances, "Result should have tokenBalances");
    assert.strictEqual(data.result.tokenBalances.length, 1);
  });

  it("getTokenMetadata returns token metadata", async () => {
    const result = await client.callTool({
      name: "getTokenMetadata",
      arguments: {
        network: "eth-mainnet",
        contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.result, "Response should have result field");
    assert.strictEqual(data.result.name, "USD Coin");
    assert.strictEqual(data.result.symbol, "USDC");
    assert.strictEqual(data.result.decimals, 6);
  });

  // ========================================
  // Transaction Receipt API Tests
  // ========================================

  it("getTransactionReceipts returns receipts for a block", async () => {
    const result = await client.callTool({
      name: "getTransactionReceipts",
      arguments: {
        network: "eth-mainnet",
        blockNumber: "0xF1D1C6",
      },
    });

    const data = parseToolResponse(result as never);
    assert.ok(data.result, "Response should have result field");
    assert.ok(data.result.receipts, "Result should have receipts");
    assert.strictEqual(data.result.receipts[0].status, 1);
    assert.strictEqual(data.result.receipts[0].blockNumber, "0xF1D1C6");
  });

  // ========================================
  // Debug API Tests
  // ========================================

  it("debugGetRawBlock returns RLP-encoded block", async () => {
    const result = await client.callTool({
      name: "debugGetRawBlock",
      arguments: { network: "eth-mainnet", blockNumberOrTag: "latest" },
    });
    const data = parseToolResponse(result as never);
    assert.strictEqual(data.result, "0xrlpdata");
  });

  it("debugGetRawHeader returns RLP-encoded header", async () => {
    const result = await client.callTool({
      name: "debugGetRawHeader",
      arguments: { network: "eth-mainnet", blockNumberOrTag: "latest" },
    });
    const data = parseToolResponse(result as never);
    assert.strictEqual(data.result, "0xrlpheader");
  });

  it("debugGetRawReceipts returns array of receipts", async () => {
    const result = await client.callTool({
      name: "debugGetRawReceipts",
      arguments: { network: "eth-mainnet", blockNumberOrTag: "latest" },
    });
    const data = parseToolResponse(result as never);
    assert.ok(Array.isArray(data.result));
    assert.strictEqual(data.result.length, 2);
  });

  it("debugTraceBlockByHash returns block traces", async () => {
    const result = await client.callTool({
      name: "debugTraceBlockByHash",
      arguments: {
        network: "eth-mainnet",
        blockHash:
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      },
    });
    const data = parseToolResponse(result as never);
    assert.ok(data.result);
  });

  it("debugTraceTransaction returns transaction trace", async () => {
    const result = await client.callTool({
      name: "debugTraceTransaction",
      arguments: { network: "eth-mainnet", transactionHash: "0xabc" },
    });
    const data = parseToolResponse(result as never);
    assert.strictEqual(data.result.type, "call");
  });

  // ========================================
  // Trace API Tests
  // ========================================

  it("traceBlock returns block traces", async () => {
    const result = await client.callTool({
      name: "traceBlock",
      arguments: { network: "eth-mainnet", blockIdentifier: "latest" },
    });
    const data = parseToolResponse(result as never);
    assert.ok(data.result);
    assert.strictEqual(data.result[0].type, "call");
  });

  it("traceTransaction returns transaction traces", async () => {
    const result = await client.callTool({
      name: "traceTransaction",
      arguments: { network: "eth-mainnet", transactionHash: "0xabc" },
    });
    const data = parseToolResponse(result as never);
    assert.ok(data.result);
  });

  it("traceFilter returns filtered traces", async () => {
    const result = await client.callTool({
      name: "traceFilter",
      arguments: { network: "eth-mainnet", fromBlock: "0x1", toBlock: "0x2" },
    });
    const data = parseToolResponse(result as never);
    assert.ok(data.result);
    assert.strictEqual(data.result[0].action.callType, "call");
  });

  // ========================================
  // Transaction Simulation Tests
  // ========================================

  it("simulateAssetChanges returns simulated changes", async () => {
    const result = await client.callTool({
      name: "simulateAssetChanges",
      arguments: {
        network: "eth-mainnet",
        transaction: { to: "0xbbb", from: "0xaaa", value: "0x1" },
      },
    });
    const data = parseToolResponse(result as never);
    assert.ok(data.result.changes);
    assert.strictEqual(data.result.changes[0].assetType, "ERC20");
  });

  it("simulateExecution returns execution traces", async () => {
    const result = await client.callTool({
      name: "simulateExecution",
      arguments: {
        network: "eth-mainnet",
        transaction: { to: "0xbbb", from: "0xaaa" },
      },
    });
    const data = parseToolResponse(result as never);
    assert.ok(data.result.calls);
  });

  // ========================================
  // Bundler API Tests
  // ========================================

  it("getMaxPriorityFeePerGas returns fee estimate", async () => {
    const result = await client.callTool({
      name: "getMaxPriorityFeePerGas",
      arguments: { network: "eth-mainnet" },
    });
    const data = parseToolResponse(result as never);
    assert.strictEqual(data.result, "0x5f5e100");
  });

  it("getUserOperationReceipt returns receipt data", async () => {
    const result = await client.callTool({
      name: "getUserOperationReceipt",
      arguments: { network: "eth-mainnet", userOpHash: "0xabc" },
    });
    const data = parseToolResponse(result as never);
    assert.strictEqual(data.result.success, true);
  });

  it("getSupportedEntryPoints returns entry points", async () => {
    const result = await client.callTool({
      name: "getSupportedEntryPoints",
      arguments: { network: "eth-mainnet" },
    });
    const data = parseToolResponse(result as never);
    assert.ok(Array.isArray(data.result));
  });

  it("estimateUserOperationGas returns gas estimates", async () => {
    const result = await client.callTool({
      name: "estimateUserOperationGas",
      arguments: {
        network: "eth-mainnet",
        userOperation: { sender: "0xaaa" },
        entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
      },
    });
    const data = parseToolResponse(result as never);
    assert.ok(data.result.preVerificationGas);
    assert.ok(data.result.callGasLimit);
  });

  // ========================================
  // UserOp Simulation Tests
  // ========================================

  it("simulateUserOperationAssetChanges returns asset changes", async () => {
    const result = await client.callTool({
      name: "simulateUserOperationAssetChanges",
      arguments: {
        network: "eth-mainnet",
        userOperation: { sender: "0xaaa" },
        entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
      },
    });
    const data = parseToolResponse(result as never);
    assert.ok(data.result.changes);
    assert.strictEqual(data.result.changes[0].assetType, "NATIVE");
  });

  // ========================================
  // Beacon API Tests
  // ========================================

  it("getBeaconGenesis returns genesis data", async () => {
    const result = await client.callTool({
      name: "getBeaconGenesis",
      arguments: { network: "eth-mainnet" },
    });
    const data = parseToolResponse(result as never);
    assert.ok(data.data.genesis_time);
    assert.ok(data.data.genesis_validators_root);
  });

  it("getBeaconBlock returns block data", async () => {
    const result = await client.callTool({
      name: "getBeaconBlock",
      arguments: { network: "eth-mainnet", blockId: "head" },
    });
    const data = parseToolResponse(result as never);
    assert.ok(data.data.message);
    assert.strictEqual(data.data.message.slot, "1234");
  });

  it("getBeaconBlockRoot returns block root", async () => {
    const result = await client.callTool({
      name: "getBeaconBlockRoot",
      arguments: { network: "eth-mainnet", blockId: "head" },
    });
    const data = parseToolResponse(result as never);
    assert.ok(data.data.root);
  });

  it("getBeaconStateFinalityCheckpoints returns finality data", async () => {
    const result = await client.callTool({
      name: "getBeaconStateFinalityCheckpoints",
      arguments: { network: "eth-mainnet", stateId: "head" },
    });
    const data = parseToolResponse(result as never);
    assert.ok(data.data.finalized);
    assert.ok(data.data.finalized.epoch);
  });

  it("getBeaconStateValidators returns validator list", async () => {
    const result = await client.callTool({
      name: "getBeaconStateValidators",
      arguments: { network: "eth-mainnet", stateId: "head" },
    });
    const data = parseToolResponse(result as never);
    assert.ok(data.data);
    assert.strictEqual(data.data[0].status, "active_ongoing");
  });

  it("getBeaconNodeSyncing returns sync status", async () => {
    const result = await client.callTool({
      name: "getBeaconNodeSyncing",
      arguments: { network: "eth-mainnet" },
    });
    const data = parseToolResponse(result as never);
    assert.strictEqual(data.data.is_syncing, false);
    assert.ok(data.data.head_slot);
  });

  it("getBeaconConfigSpec returns chain config", async () => {
    const result = await client.callTool({
      name: "getBeaconConfigSpec",
      arguments: { network: "eth-mainnet" },
    });
    const data = parseToolResponse(result as never);
    assert.strictEqual(data.data.SECONDS_PER_SLOT, "12");
    assert.strictEqual(data.data.SLOTS_PER_EPOCH, "32");
  });

  // ========================================
  // Solana DAS API Tests
  // ========================================

  it("solanaGetAsset returns asset data", async () => {
    const result = await client.callTool({
      name: "solanaGetAsset",
      arguments: { network: "solana-mainnet", id: "abc123" },
    });
    const data = parseToolResponse(result as never);
    assert.ok(data.result);
    assert.strictEqual(data.result.id, "abc123");
  });

  it("solanaGetAssets returns multiple assets", async () => {
    const result = await client.callTool({
      name: "solanaGetAssets",
      arguments: { network: "solana-mainnet", ids: ["abc123", "def456"] },
    });
    const data = parseToolResponse(result as never);
    assert.ok(data.result);
    assert.strictEqual(data.result.length, 2);
  });

  it("solanaGetAssetProof returns merkle proof", async () => {
    const result = await client.callTool({
      name: "solanaGetAssetProof",
      arguments: { network: "solana-mainnet", id: "abc123" },
    });
    const data = parseToolResponse(result as never);
    assert.ok(data.result.root);
    assert.ok(data.result.proof);
  });

  it("solanaGetAssetsByOwner returns owner's assets", async () => {
    const result = await client.callTool({
      name: "solanaGetAssetsByOwner",
      arguments: { network: "solana-mainnet", ownerAddress: "owner123" },
    });
    const data = parseToolResponse(result as never);
    assert.ok(data.result.items);
    assert.strictEqual(data.result.total, 1);
  });

  it("solanaSearchAssets returns search results", async () => {
    const result = await client.callTool({
      name: "solanaSearchAssets",
      arguments: { network: "solana-mainnet", ownerAddress: "owner123" },
    });
    const data = parseToolResponse(result as never);
    assert.ok(data.result.items);
    assert.strictEqual(data.result.total, 1);
  });

  it("solanaGetTokenAccounts returns token accounts", async () => {
    const result = await client.callTool({
      name: "solanaGetTokenAccounts",
      arguments: { network: "solana-mainnet", ownerAddress: "owner123" },
    });
    const data = parseToolResponse(result as never);
    assert.ok(data.result.items);
    assert.strictEqual(data.result.items[0].mint, "mint123");
  });

  // ========================================
  // Error Handling
  // ========================================

  it("tool errors return structured error response", async () => {
    // This test uses its own setup since it needs a custom mock
    await client.close();
    await server.close();

    const alchemyApi = createMockAlchemyApi();
    // Override one method to throw
    alchemyApi.getTokenPriceBySymbol = async () => {
      throw new Error("API rate limit exceeded");
    };

    const errorServer = new McpServer({
      name: "test-server",
      version: "0.0.1",
    });
    registerTools(errorServer, alchemyApi);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const errorClient = new Client({ name: "test-client", version: "0.0.1" });

    await errorServer.connect(serverTransport);
    await errorClient.connect(clientTransport);

    const result = await errorClient.callTool({
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

    await errorClient.close();
    await errorServer.close();

    // Re-setup for afterEach to close cleanly
    ({ client, server } = await setupTestClient());
  });
});
