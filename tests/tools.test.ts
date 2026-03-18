import 'reflect-metadata';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { AlchemyApi } from '../api/alchemyApi.js';
import { registerTools } from '../api/registerTools.js';
import { setupDi } from '../di/di-container.js';
import { ClientsModule } from '../di/modules/clients.module.js';
import { JsonRpcClientProvider } from '../api/client-providers.js';

// ========================================
// Expected tool names — the canonical list
// ========================================

const EXPECTED_TOOLS = [
  // Prices API
  'fetchTokenPriceBySymbol',
  'fetchTokenPriceByAddress',
  'fetchTokenPriceHistoryBySymbol',
  'fetchTokenPriceHistoryByTimeFrame',
  // MultiChain Token API
  'fetchTokensOwnedByMultichainAddresses',
  // MultiChain Transaction History API
  'fetchAddressTransactionHistory',
  // Transfers API
  'fetchTransfers',
  // NFT API (multichain)
  'fetchNftsOwnedByMultichainAddresses',
  'fetchNftContractDataByMultichainAddress',
  // Wallet API
  'sendTransaction',
  // Swap API
  'swap',
].sort();

// ========================================
// DI Container Tests
// ========================================

describe('DI Container', () => {
  it('should bootstrap with all bindings resolved', () => {
    const container = setupDi([new ClientsModule()]);

    const api = container.get(AlchemyApi);
    assert.ok(api instanceof AlchemyApi, 'AlchemyApi should be an instance of AlchemyApi');

    const jsonRpc = container.get(JsonRpcClientProvider);
    assert.ok(jsonRpc instanceof JsonRpcClientProvider);
  });

  it('should return singletons for AlchemyApi', () => {
    const container = setupDi([new ClientsModule()]);
    const api1 = container.get(AlchemyApi);
    const api2 = container.get(AlchemyApi);
    assert.strictEqual(api1, api2, 'AlchemyApi should be a singleton');
  });

  it('should return singletons for client providers', () => {
    const container = setupDi([new ClientsModule()]);
    const p1 = container.get(JsonRpcClientProvider);
    const p2 = container.get(JsonRpcClientProvider);
    assert.strictEqual(p1, p2, 'JsonRpcClientProvider should be a singleton');
  });
});

// ========================================
// Client Provider Tests
// ========================================

describe('Client Providers', () => {
  it('JsonRpcClientProvider should cache clients by network', () => {
    const container = setupDi([new ClientsModule()]);
    const provider = container.get(JsonRpcClientProvider);

    const client1 = provider.get('eth-mainnet');
    const client2 = provider.get('eth-mainnet');
    const client3 = provider.get('base-mainnet');

    assert.strictEqual(client1, client2, 'Same network should return cached client');
    assert.notStrictEqual(client1, client3, 'Different networks should return different clients');
  });

  it('JsonRpcClientProvider should use correct base URL pattern', () => {
    const container = setupDi([new ClientsModule()]);
    const provider = container.get(JsonRpcClientProvider);
    const client = provider.get('eth-mainnet');
    const baseURL = (client.defaults as any).baseURL as string;
    assert.ok(baseURL.includes('eth-mainnet.g.alchemy.com/v2/'), `Base URL should contain network: ${baseURL}`);
  });
});

// ========================================
// MCP Tool Registration Tests
// ========================================

describe('MCP Tool Registration', () => {
  it('should register all expected tools', async () => {
    const container = setupDi([new ClientsModule()]);
    const alchemyApi = container.get(AlchemyApi);

    const server = new McpServer({
      name: 'test-server',
      version: '0.0.1',
    });

    registerTools(server, alchemyApi);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '0.0.1' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.listTools();
    const registeredNames = result.tools.map((t: any) => t.name).sort();

    assert.strictEqual(
      registeredNames.length,
      EXPECTED_TOOLS.length,
      `Expected ${EXPECTED_TOOLS.length} tools, got ${registeredNames.length}.\n` +
      `Missing: ${EXPECTED_TOOLS.filter(t => !registeredNames.includes(t)).join(', ')}\n` +
      `Extra: ${registeredNames.filter((t: string) => !EXPECTED_TOOLS.includes(t)).join(', ')}`
    );

    for (const toolName of EXPECTED_TOOLS) {
      assert.ok(
        registeredNames.includes(toolName),
        `Missing tool: ${toolName}`
      );
    }

    for (const toolName of registeredNames) {
      assert.ok(
        EXPECTED_TOOLS.includes(toolName),
        `Unexpected tool: ${toolName}`
      );
    }

    await client.close();
    await server.close();
  });

  it('every tool should have an inputSchema', async () => {
    const container = setupDi([new ClientsModule()]);
    const alchemyApi = container.get(AlchemyApi);

    const server = new McpServer({
      name: 'test-server',
      version: '0.0.1',
    });

    registerTools(server, alchemyApi);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '0.0.1' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.listTools();

    for (const tool of result.tools) {
      assert.ok(
        tool.inputSchema !== undefined && tool.inputSchema !== null,
        `Tool "${tool.name}" should have an inputSchema`
      );
      assert.strictEqual(
        tool.inputSchema.type,
        'object',
        `Tool "${tool.name}" inputSchema.type should be "object"`
      );
    }

    await client.close();
    await server.close();
  });
});
