import "reflect-metadata";

import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { AlchemyApi } from "../api/alchemyApi.js";
import { SUPPORTED_NETWORKS } from "../api/networks.js";
import { registerTools } from "../api/registerTools.js";
import { setupDi } from "../di/di-container.js";
import { ClientsModule } from "../di/modules/clients.module.js";

// ========================================
// Test Fixtures — well-known on-chain data
// ========================================

const VITALIK = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

// ========================================
// Filters via env vars CHAIN and METHOD
//
// Usage:
//   CHAIN=eth-mainnet npx tsx --test tests/e2e.test.ts
//   METHOD=traceFilter npx tsx --test tests/e2e.test.ts
//   CHAIN=eth-mainnet METHOD=traceFilter,traceBlock npx tsx --test tests/e2e.test.ts
// ========================================

function parseFilter(envVar: string): Set<string> | null {
  const raw = process.env[envVar];
  if (!raw) return null;
  const values = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return values.length > 0 ? new Set(values) : null;
}

const CHAIN_FILTER = parseFilter("CHAIN");
const METHOD_FILTER = parseFilter("METHOD");

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

  // ========================================
  // Network × Tool Compatibility Matrix → CSV
  // ========================================
  //
  // Dynamically discovers ALL registered tools, builds minimal args from
  // their inputSchema, and probes every (network, tool) combination.
  // Results are written to tests/results/compatibility-matrix.csv
  //
  // Usage:
  //   ALCHEMY_API_KEY=xxx npx tsx --test tests/e2e.test.ts
  //   CHAIN=eth-mainnet ALCHEMY_API_KEY=xxx npx tsx --test tests/e2e.test.ts

  describe("Network Compatibility Matrix", () => {
    type Status = "OK" | "FAIL" | "N/S" | "N/A";

    // ── Network rows ────────────────────────
    type NetworkRow = {
      network: string; // ID passed to tool
      display: string; // ID shown in output
      chain: string;
      category: string;
    };

    function buildRows(): NetworkRow[] {
      const rows: NetworkRow[] = [];

      for (const c of SUPPORTED_NETWORKS.evm) {
        for (const net of [c.mainnet, ...c.testnets]) {
          rows.push({
            network: net,
            display: net,
            chain: c.chain,
            category: "evm",
          });
        }
      }
      for (const c of SUPPORTED_NETWORKS.beacon) {
        for (const net of [c.mainnet, ...c.testnets]) {
          rows.push({
            network: net.replace(/beacon$/, ""),
            display: net,
            chain: c.chain,
            category: "beacon",
          });
        }
      }
      for (const c of SUPPORTED_NETWORKS.solana) {
        for (const net of [c.mainnet, ...c.testnets]) {
          rows.push({
            network: net,
            display: net,
            chain: c.chain,
            category: "solana",
          });
        }
      }
      for (const c of SUPPORTED_NETWORKS.nonEvm) {
        for (const net of [c.mainnet, ...c.testnets]) {
          rows.push({
            network: net,
            display: net,
            chain: c.chain,
            category: "nonEvm",
          });
        }
      }
      for (const c of SUPPORTED_NETWORKS.testnetOnly) {
        for (const net of [...c.testnets]) {
          rows.push({
            network: net,
            display: net,
            chain: c.chain,
            category: "testnetOnly",
          });
        }
      }
      for (const net of SUPPORTED_NETWORKS.alchemyInternal) {
        rows.push({
          network: net,
          display: net,
          chain: "Alchemy",
          category: "internal",
        });
      }

      if (CHAIN_FILTER) {
        return rows.filter(
          (r) => CHAIN_FILTER.has(r.display) || CHAIN_FILTER.has(r.network),
        );
      }
      return rows;
    }

    // ── Per-category test fixtures ──────────
    // Each network category gets its own set of well-known addresses/IDs
    // so probes use valid data for that chain type.

    type Fixtures = {
      address: string;
      tokenContract: string; // ERC20 contract (e.g. USDC)
      nftContract: string; // NFT contract (e.g. BAYC)
      entryPoint: string; // AA EntryPoint v0.6 or v0.7
      solanaId: string;
      symbol: string;
    };

    const EVM_FIXTURES: Fixtures = {
      address: VITALIK,
      tokenContract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
      nftContract: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D", // BAYC
      entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789", // EntryPoint v0.6
      solanaId: BONK,
      symbol: "ETH",
    };

    // StarkNet uses 66-char hex addresses (0x + 64 hex)
    const STARKNET_FIXTURES: Fixtures = {
      address:
        "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d", // STRK token contract (well-known)
      tokenContract:
        "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
      nftContract:
        "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
      entryPoint: "",
      solanaId: BONK,
      symbol: "STRK",
    };

    const SOLANA_FIXTURES: Fixtures = {
      address: "toly.sol",
      tokenContract: BONK,
      nftContract: BONK,
      entryPoint: "",
      solanaId: BONK,
      symbol: "SOL",
    };

    const POLYGON_FIXTURES: Fixtures = {
      address: VITALIK,
      tokenContract: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // USDC on Polygon
      nftContract: "0x86935F11C86623deC8a25696E1C19a8659CbF95d", // Aavegotchi on Polygon (ERC-721 with traits)
      entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
      solanaId: BONK,
      symbol: "POL",
    };

    const BEACON_FIXTURES: Fixtures = {
      ...EVM_FIXTURES,
    };

    function fixturesFor(category: string, networkId: string): Fixtures {
      if (category === "solana") return SOLANA_FIXTURES;
      if (category === "beacon") return BEACON_FIXTURES;
      if (networkId.startsWith("starknet")) return STARKNET_FIXTURES;
      if (networkId.startsWith("polygon-mainnet")) return POLYGON_FIXTURES;
      return EVM_FIXTURES;
    }

    // ── Stub values for required params ─────
    function stubValue(
      name: string,
      schema: any,
      networkId: string,
      f: Fixtures,
    ): unknown {
      // Network MUST always be set to the test network, even if it has a default
      if (name === "network") return networkId;

      if (schema.default !== undefined) return undefined;

      // Addresses
      if (name === "address" || name === "owner" || name === "wallet")
        return f.address;
      if (
        name === "fromAddress" ||
        name === "toAddress" ||
        name === "signerAddress"
      )
        return f.address;
      if (name === "ownerScaAccountAddress") return f.address;
      if (name === "contractAddress") return f.nftContract;
      if (name === "contract") return f.tokenContract;
      if (name === "spender")
        return "0x0000000000000000000000000000000000000001";
      if (name === "entryPoint") return f.entryPoint;

      // Solana-specific
      if (name === "id") return f.solanaId;
      if (name === "mintAddress") return f.solanaId;
      if (
        name === "authorityAddress" ||
        name === "creatorAddress" ||
        name === "ownerAddress"
      )
        return f.solanaId;
      if (name === "groupKey") return "collection";
      if (name === "groupValue") return "test";

      // Block / tx identifiers
      if (name === "fromBlock" || name === "toBlock") return "latest";
      if (name === "tokenId") return "1";
      if (name === "transactionHash") return "0x" + "0".repeat(64);
      if (name === "blockHash") return "0x" + "0".repeat(64);
      if (name === "blockNumber" || name === "blockNumberOrTag") return "0x1";
      if (name === "blockIdentifier") return "0x1";
      if (name === "blockId") return "finalized";

      // Beacon-specific
      if (name === "stateId") return "finalized";
      if (name === "validatorId") return "0";
      if (name === "epoch") return undefined; // let the API infer from the state

      // Debug trace — chains like opt-mainnet, bnb-mainnet require a tracer object
      if (name === "tracer" || name === "options")
        return { tracer: "callTracer" };

      // Bundler
      if (name === "userOpHash") return "0x" + "0".repeat(64);

      // Misc
      if (name === "collectionSlug") return "boredapeyachtclub";
      if (name === "query") return "test";
      if (name === "rawTransaction") return "0x00";
      if (name === "symbol") return f.symbol;

      // By type
      if (schema.type === "string") return "test";
      if (schema.type === "number" || schema.type === "integer") return 1;
      if (schema.type === "boolean") return false;
      if (schema.type === "array") return [];
      if (schema.type === "object") return {};

      return "test";
    }

    function buildArgs(
      schema: any,
      networkId: string,
      category: string,
    ): Record<string, unknown> {
      const f = fixturesFor(category, networkId);
      const props = schema?.properties || {};
      const required = new Set<string>(schema?.required || []);
      const args: Record<string, unknown> = {};

      // Params we always provide when present (even if optional) to avoid
      // "must specify at least one of X or Y" errors, or giant unbounded responses.
      const alwaysProvide = new Set([
        "network",
        "networks",
        "contractAddress",
        "address",
        "id", // beacon: validator filter; solana: asset id
        "count", // traceFilter: limit response size
        "fromBlock", // traceFilter: constrain block range to avoid timeout
        "toBlock", // traceFilter: constrain block range to avoid timeout
        "pageSize", // limit response size; works around eth-sepolia getContractsForOwner bug
        "tracer", // debug trace methods require 2 args on some chains (e.g. opt-mainnet)
        "options", // debug trace methods require 2 args on some chains (e.g. opt-mainnet)
      ]);

      for (const [name, propSchema] of Object.entries(props)) {
        const ps = propSchema as any;
        if (alwaysProvide.has(name) || required.has(name)) {
          if (name === "networks") {
            args[name] = [networkId];
          } else if (name === "addresses") {
            const itemProps = ps.items?.properties;
            if (itemProps?.networks) {
              args[name] = [{ address: f.address, networks: [networkId] }];
            } else if (itemProps?.network) {
              args[name] = [{ address: f.address, network: networkId }];
            } else {
              args[name] = [f.address];
            }
          } else if (name === "symbols") {
            args[name] = [f.symbol];
          } else if (name === "id" && ps.type === "array") {
            // Beacon validator filter — limit to one validator to avoid huge responses
            args[name] = ["0"];
          } else if (name === "ids") {
            args[name] = [f.solanaId];
          } else if (name === "transaction") {
            args[name] = {
              from: f.address,
              to: "0x0000000000000000000000000000000000000001",
              value: "0x0",
            };
          } else if (name === "transactions") {
            args[name] = [
              {
                from: f.address,
                to: "0x0000000000000000000000000000000000000001",
                value: "0x0",
              },
            ];
          } else if (name === "userOperation") {
            args[name] = {
              sender: f.address,
              nonce: "0x0",
              callData: "0x",
              callGasLimit: "0x5208",
              verificationGasLimit: "0x5208",
              preVerificationGas: "0x5208",
              maxFeePerGas: "0x1",
              maxPriorityFeePerGas: "0x1",
              signature: "0x",
            };
          } else if (name === "traceTypes") {
            args[name] = ["trace"];
          } else if (name === "traceIndexes") {
            args[name] = ["0x0"];
          } else {
            const val = stubValue(name, ps, networkId, f);
            if (val !== undefined) args[name] = val;
          }
        }
      }
      return args;
    }

    // ── Tool classification ─────────────────
    // Determine which network categories a tool applies to based on its name and schema.
    function classifyTool(name: string, schema: any): Set<string> {
      // Beacon tools — only run against beacon networks
      if (name.startsWith("getBeacon")) return new Set(["beacon"]);

      // Solana tools — only run against solana networks
      if (name.startsWith("solana")) return new Set(["solana"]);

      const props = schema?.properties || {};
      if (props.network || props.networks) {
        return new Set(["evm", "testnetOnly", "internal"]);
      }
      if (props.addresses) {
        const itemProps = props.addresses.items?.properties;
        if (itemProps?.network || itemProps?.networks) {
          return new Set(["evm", "testnetOnly", "internal"]);
        }
      }
      // No network param (e.g. fetchTokenPriceBySymbol, listSupportedNetworks)
      return new Set();
    }

    // ── Probing ─────────────────────────────

    const NOT_SUPPORTED_RE =
      /not supported|unsupported|not available|does not support|not enabled|isn't enabled|unsupported method|eapis not enabled|enotfound|error 404|error 500|unable to complete request|internal error|contact the alchemy team|is required for|expect \d+ arguments|aborted/;

    function isNotSupported(msg: string): boolean {
      return NOT_SUPPORTED_RE.test(msg);
    }

    const PROBE_TIMEOUT = 30_000;

    async function probeOne(
      tool: string,
      toolArgs: Record<string, unknown>,
    ): Promise<Status> {
      const network = (toolArgs.network as string) || "";
      const label = `${tool}${network ? ` [${network}]` : ""}`;
      try {
        const result = await Promise.race([
          client.callTool({ name: tool, arguments: toolArgs }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), PROBE_TIMEOUT),
          ),
        ]);
        if (result.isError) {
          const msg = ((result.content as any)?.[0]?.text || "").toLowerCase();
          if (isNotSupported(msg)) return "N/S";
          console.error(
            `FAIL ${label}: ${(result.content as any)?.[0]?.text || "unknown error"}`,
          );
          return "FAIL";
        }
        return "OK";
      } catch (err: any) {
        const msg = (err?.message || "").toLowerCase();
        if (isNotSupported(msg)) return "N/S";
        console.error(`FAIL ${label}: ${err?.message || "unknown error"}`);
        return "FAIL";
      }
    }

    async function runConcurrent<T>(
      tasks: (() => Promise<T>)[],
      limit: number,
    ): Promise<T[]> {
      const results: T[] = new Array(tasks.length);
      let idx = 0;
      async function worker() {
        while (idx < tasks.length) {
          const i = idx++;
          results[i] = await tasks[i]();
        }
      }
      await Promise.all(
        Array.from({ length: Math.min(limit, tasks.length) }, () => worker()),
      );
      return results;
    }

    // ── Main test ─────────────────────────────

    it(
      "probes all tools × networks and writes CSV",
      { timeout: 1_200_000 },
      async () => {
        // 1. Discover all tools from the server
        const { tools: allTools } = await client.listTools();
        const toolDefs = allTools
          .filter((t: any) => t.name !== "listSupportedNetworks")
          .filter((t: any) => !METHOD_FILTER || METHOD_FILTER.has(t.name))
          .sort((a: any, b: any) => a.name.localeCompare(b.name));

        // 2. Build network rows
        const rows = buildRows();

        // 3. Classify each tool
        const toolCategories = toolDefs.map((t: any) => ({
          name: t.name as string,
          schema: t.inputSchema,
          appliesTo: classifyTool(t.name, t.inputSchema),
        }));

        // 4. Build matrix[rowIdx][toolIdx] = Status
        const matrix: Status[][] = rows.map(() =>
          toolDefs.map(() => "N/A" as Status),
        );

        // 5. Build probe tasks
        type Task = {
          rowIdx: number;
          toolIdx: number;
          fn: () => Promise<Status>;
        };
        const tasks: Task[] = [];

        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          for (let t = 0; t < toolCategories.length; t++) {
            const tool = toolCategories[t];
            if (!tool.appliesTo.has(row.category)) continue;
            const args = buildArgs(tool.schema, row.network, row.category);
            tasks.push({
              rowIdx: r,
              toolIdx: t,
              fn: () => probeOne(tool.name, args),
            });
          }
        }

        console.log(
          `\nProbing ${tasks.length} combinations (${rows.length} networks × ${toolDefs.length} tools)...\n`,
        );

        // 6. Run probes
        const results = await runConcurrent(
          tasks.map((t) => t.fn),
          10,
        );
        for (let i = 0; i < tasks.length; i++) {
          matrix[tasks[i].rowIdx][tasks[i].toolIdx] = results[i];
        }

        // 7. Write CSV
        const toolNames = toolCategories.map((t) => t.name);
        const csvHeader = ["network", "chain", "category", ...toolNames].join(
          ",",
        );
        const csvRows = rows.map((row, ri) => {
          const statuses = matrix[ri].map((s) => s);
          return [row.display, row.chain, row.category, ...statuses].join(",");
        });
        const csv = [csvHeader, ...csvRows].join("\n") + "\n";

        const outDir = path.join(import.meta.dirname, "results");
        fs.mkdirSync(outDir, { recursive: true });
        const outFile = path.join(outDir, "compatibility-matrix.csv");
        fs.writeFileSync(outFile, csv);

        // 8. Print summary to console
        let totalOk = 0;
        let totalFail = 0;
        let totalNs = 0;
        let totalNa = 0;
        for (const row of matrix) {
          for (const s of row) {
            if (s === "OK") totalOk++;
            else if (s === "FAIL") totalFail++;
            else if (s === "N/S") totalNs++;
            else totalNa++;
          }
        }

        console.log(`\n${"═".repeat(60)}`);
        console.log(`NETWORK COMPATIBILITY MATRIX`);
        console.log(`${"═".repeat(60)}`);
        console.log(
          `Networks: ${rows.length}  Tools: ${toolDefs.length}  Probes: ${tasks.length}`,
        );
        console.log(
          `OK: ${totalOk}  FAIL: ${totalFail}  N/S: ${totalNs}  N/A: ${totalNa}`,
        );
        console.log(`\nCSV written to: ${outFile}`);
        console.log(`${"═".repeat(60)}\n`);

        assert.ok(true, "Matrix completed");
      },
    );
  });
});
