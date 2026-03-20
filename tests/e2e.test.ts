import "reflect-metadata";

import assert from "node:assert";
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

const TIMEOUT = 30_000;

// ========================================
// Chain filter via env var CHAIN
// Filters the Network Compatibility Matrix to specific networks.
//
// Usage:
//   CHAIN=geist-mainnet npx tsx --test tests/e2e.test.ts
//   CHAIN=eth-mainnet,base-mainnet npx tsx --test tests/e2e.test.ts
// ========================================

const CHAIN_FILTER: Set<string> | null = (() => {
  const raw = process.env.CHAIN;
  if (!raw) return null;
  const values = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return values.length > 0 ? new Set(values) : null;
})();

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
  // Smoke test — listSupportedNetworks
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
  // Network Compatibility Matrix
  // ========================================
  //
  // Rows = networks, Columns = representative methods per API category.
  //
  // Run only this suite:
  //   ALCHEMY_API_KEY=xxx npx tsx --test tests/e2e.test.ts \
  //     --test-name-pattern "Network Compatibility"
  //
  // Filter to specific networks:
  //   CHAIN=geist-mainnet ALCHEMY_API_KEY=xxx npx tsx --test tests/e2e.test.ts \
  //     --test-name-pattern "Network Compatibility"

  describe("Network Compatibility Matrix", () => {
    // ── Column definitions ────────────────────
    // Each column is a representative tool from a different API category.
    // `appliesTo` controls which network categories get probed vs marked "·".

    type Status = "pass" | "fail" | "n/s" | "·";

    const COLUMNS = [
      {
        label: "Tokens",
        tool: "getTokenBalances",
        appliesTo: new Set(["evm", "testnetOnly", "internal"]),
        args: (net: string) => ({ network: net, address: VITALIK }),
      },
      {
        label: "NFTs",
        tool: "getNFTsForOwner",
        appliesTo: new Set(["evm", "testnetOnly", "internal"]),
        args: (net: string) => ({
          network: net,
          owner: VITALIK,
          pageSize: 1,
        }),
      },
      {
        label: "Transfers",
        tool: "fetchTransfers",
        appliesTo: new Set(["evm", "testnetOnly", "internal"]),
        args: (net: string) => ({
          network: net,
          fromAddress: VITALIK,
          category: ["external"],
          maxCount: "0x1",
        }),
      },
      {
        label: "Simulate",
        tool: "simulateAssetChanges",
        appliesTo: new Set(["evm", "testnetOnly", "internal"]),
        args: (net: string) => ({
          network: net,
          transaction: {
            from: VITALIK,
            to: "0x0000000000000000000000000000000000000001",
            value: "0x0",
          },
        }),
      },
      {
        label: "Beacon",
        tool: "getBeaconGenesis",
        appliesTo: new Set(["beacon"]),
        args: (net: string) => ({ network: net }),
      },
      {
        label: "Solana",
        tool: "solanaGetAsset",
        appliesTo: new Set(["solana"]),
        args: (net: string) => ({ network: net, id: BONK }),
      },
    ] as const;

    // ── Row definitions ──────────────────────
    type NetworkRow = {
      network: string; // ID passed to tool (may differ from display)
      display: string; // ID shown in table
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
      // Beacon — tools expect base name; BeaconClientProvider appends "beacon"
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

      // Apply --chain filter if provided
      if (CHAIN_FILTER) {
        return rows.filter(
          (r) => CHAIN_FILTER.has(r.display) || CHAIN_FILTER.has(r.network),
        );
      }
      return rows;
    }

    // ── Helpers ───────────────────────────────

    const NOT_SUPPORTED_RE =
      /not supported|unsupported|not available|does not support|not enabled|isn't enabled|unsupported method|eapis not enabled|enotfound/;

    function isNotSupported(msg: string): boolean {
      return NOT_SUPPORTED_RE.test(msg);
    }

    const PROBE_TIMEOUT = 15_000;

    async function probeOne(
      tool: string,
      toolArgs: Record<string, unknown>,
    ): Promise<Status> {
      try {
        const result = await Promise.race([
          client.callTool({ name: tool, arguments: toolArgs }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), PROBE_TIMEOUT),
          ),
        ]);
        if (result.isError) {
          const msg = ((result.content as any)?.[0]?.text || "").toLowerCase();
          if (isNotSupported(msg)) return "n/s";
          return "fail";
        }
        return "pass";
      } catch (err: any) {
        const msg = (err?.message || "").toLowerCase();
        if (isNotSupported(msg)) return "n/s";
        return "fail";
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
      "probes all supported networks and prints summary",
      { timeout: 600_000 },
      async () => {
        const rows = buildRows();

        // matrix[rowIdx][colIdx] = Status
        const matrix: Status[][] = rows.map(() =>
          COLUMNS.map(() => "·" as Status),
        );

        // Build concurrent probe tasks
        type Task = {
          rowIdx: number;
          colIdx: number;
          fn: () => Promise<Status>;
        };
        const tasks: Task[] = [];

        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          for (let c = 0; c < COLUMNS.length; c++) {
            const col = COLUMNS[c];
            if (!col.appliesTo.has(row.category)) continue; // stays "·"
            tasks.push({
              rowIdx: r,
              colIdx: c,
              fn: () => probeOne(col.tool, col.args(row.network)),
            });
          }
        }

        // Run all probes with concurrency limit
        const results = await runConcurrent(
          tasks.map((t) => t.fn),
          10,
        );
        for (let i = 0; i < tasks.length; i++) {
          matrix[tasks[i].rowIdx][tasks[i].colIdx] = results[i];
        }

        // ── Render table ────────────────────────
        const SYM: Record<Status, string> = {
          pass: " OK ",
          fail: "FAIL",
          "n/s": "N/S ",
          "·": " ·  ",
        };

        const W = { net: 28, chain: 18 };
        const colW = 10; // width per method column

        // Header row
        let hdr =
          " " + "Network".padEnd(W.net) + "│ " + "Chain".padEnd(W.chain) + "│";
        for (const col of COLUMNS)
          hdr += " " + col.label.padEnd(colW - 1) + "│";

        const totalW = hdr.length;
        const sep = "─".repeat(totalW - 1);

        console.log("\n┌" + sep + "┐");
        console.log(
          "│ NETWORK COMPATIBILITY MATRIX" +
            " ".repeat(Math.max(0, totalW - 31)) +
            "│",
        );
        console.log("├" + sep + "┤");
        console.log(hdr);
        console.log("├" + sep + "┤");

        // Category grouping
        const categoryOrder: Record<string, number> = {
          evm: 0,
          beacon: 1,
          solana: 2,
          nonEvm: 3,
          testnetOnly: 4,
          internal: 5,
        };
        const sortedIndices = rows
          .map((_, i) => i)
          .sort(
            (a, b) =>
              (categoryOrder[rows[a].category] ?? 99) -
                (categoryOrder[rows[b].category] ?? 99) ||
              rows[a].display.localeCompare(rows[b].display),
          );

        let prevCat = "";
        for (const ri of sortedIndices) {
          const row = rows[ri];
          if (row.category !== prevCat && prevCat !== "") {
            console.log("├" + sep + "┤");
          }
          prevCat = row.category;

          let line =
            " " +
            row.display.padEnd(W.net) +
            "│ " +
            row.chain.slice(0, W.chain).padEnd(W.chain) +
            "│";
          for (let c = 0; c < COLUMNS.length; c++) {
            line += "  " + SYM[matrix[ri][c]].padEnd(colW - 2) + "│";
          }
          console.log(line);
        }

        // ── Summary per column ──────────────────
        const colStats = COLUMNS.map((col, ci) => {
          let pass = 0;
          let fail = 0;
          let ns = 0;
          let na = 0;
          for (let r = 0; r < rows.length; r++) {
            const s = matrix[r][ci];
            if (s === "pass") pass++;
            else if (s === "fail") fail++;
            else if (s === "n/s") ns++;
            else na++;
          }
          return { label: col.label, pass, fail, ns, na };
        });

        const totalProbes = tasks.length;
        const totalPass = colStats.reduce((s, c) => s + c.pass, 0);
        const totalFail = colStats.reduce((s, c) => s + c.fail, 0);
        const totalNs = colStats.reduce((s, c) => s + c.ns, 0);

        console.log("├" + sep + "┤");

        // Per-column summary row
        let sumRow =
          " " + "TOTALS".padEnd(W.net) + "│ " + " ".padEnd(W.chain) + "│";
        for (const cs of colStats) {
          const cell = `${cs.pass}/${cs.pass + cs.fail + cs.ns}`;
          sumRow += "  " + cell.padEnd(colW - 2) + "│";
        }
        console.log(sumRow);

        console.log("├" + sep + "┤");
        const summaryLine = `  Probes: ${totalProbes}  OK: ${totalPass}  FAIL: ${totalFail}  N/S: ${totalNs}  Networks: ${rows.length}`;
        console.log(summaryLine.padEnd(totalW) + "│");
        console.log("└" + sep + "┘\n");

        // Informational — always passes
        assert.ok(true, "Network compatibility matrix completed");
      },
    );
  });
});
