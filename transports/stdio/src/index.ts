#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "@alchemy/mcp-core";

function resolveVersion(): string {
  if (process.env.SERVER_VERSION) return process.env.SERVER_VERSION; // override supported [[memory:5498526]]
  try {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const pkgPath = resolve(currentDir, "../package.json");
    const raw = readFileSync(pkgPath, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function run() {
  const version = resolveVersion();
  const server = createServer(version);
  console.error("server", server);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Alchemy MCP Server (stdio) is running');
}

run().catch((error) => {
  console.error("Fatal error while starting stdio server:", error);
  process.exit(1);
});


