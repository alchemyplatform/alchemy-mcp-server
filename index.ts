#!/usr/bin/env node

import 'reflect-metadata';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AlchemyApi } from './api/alchemyApi.js';
import { registerTools } from './api/registerTools.js';
import { setupDi } from './di/di-container.js';
import { ClientsModule } from './di/modules/clients.module.js';

// ========================================
// SERVER STARTUP
// ========================================

async function runServer() {
  const container = setupDi([new ClientsModule()]);
  const alchemyApi = container.get(AlchemyApi);

  const server = new McpServer({
    name: "alchemy-mcp-server",
    version: "0.2.0-rc.0",
  });

  registerTools(server, alchemyApi);

  const transport = new StdioServerTransport();
  try {
    await server.connect(transport);
    console.error('Alchemy MCP Server is running on stdio');
  } catch (error) {
    console.error("Error during server connection:", error);
    if (error instanceof Error) {
      console.error("Detailed error message:", error.message);
    }
    console.error("Possible causes: network issues, incorrect configuration, or server not reachable.");
    console.error("Consider checking the server logs and configuration.");
    process.exit(1);
  }
}

runServer().catch((error) => {
  console.error("Fatal error in runServer():", error);
  process.exit(1);
});
