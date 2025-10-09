#!/usr/bin/env node

// Import config first to ensure environment variables are loaded
import { SERVER_VERSION, validateRequiredEnvVars } from "@alchemy/mcp-config";
import { createServer } from "@alchemy/mcp-core";

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

function resolveVersion(): string {
  if (SERVER_VERSION) return SERVER_VERSION; // override supported [[memory:5498526]]
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
  // Validate environment variables before starting
  validateRequiredEnvVars();
  
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


