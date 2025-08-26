// Import config first to ensure environment variables are loaded
import { PORT, HOST, validateRequiredEnvVars } from "@alchemy/mcp-config";

import express from "express";
import { MCPServer } from "./server.js";

// Validate environment variables before starting
validateRequiredEnvVars();

const app = express();
app.use(express.json());

const port = Number(PORT);
const host = HOST;

const mcpServer = new MCPServer();

// MCP endpoints
app.post('/mcp', async (req, res) => {
  console.log('Received MCP request');
  await mcpServer.handlePostRequest(req, res);
});

app.get('/mcp', async (req, res) => {
  await mcpServer.handleGetRequest(req, res);
});

app.listen(port, host, () => {
  console.log(`Alchemy MCP Server (HTTP) listening at http://${host}:${port}/mcp`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down MCP server...');
  await mcpServer.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down MCP server...');
  await mcpServer.cleanup();
  process.exit(0);
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  try {
    await mcpServer.cleanup();
  } catch (cleanupError) {
    console.error('Error during cleanup:', cleanupError);
  }
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  try {
    await mcpServer.cleanup();
  } catch (cleanupError) {
    console.error('Error during cleanup:', cleanupError);
  }
  process.exit(1);
});


