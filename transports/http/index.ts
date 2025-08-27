// Import config first to ensure environment variables are loaded
import { PORT, HOST, validateRequiredEnvVars } from "@alchemy/mcp-config";

import express from "express";
import { MCPServer } from "./server.js";

// Validate environment variables before starting
validateRequiredEnvVars();

const app = express();
app.use(express.json());

// Heroku-compatible port and host configuration
const port = Number(process.env.PORT) || Number(PORT) || 3001;
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : (HOST || '127.0.0.1');

const mcpServer = new MCPServer();

// Health check endpoint for Heroku
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    activeSessions: Object.keys(mcpServer.transports).length,
    activeHeartbeats: Object.keys(mcpServer.heartbeats).length,
    version: process.env.SERVER_VERSION || '0.0.0'
  };
  res.json(health);
});

// MCP endpoints
app.post('/mcp', async (req, res) => {
  console.log('Received MCP request');
  await mcpServer.handlePostRequest(req, res);
});

app.get('/mcp', async (req, res) => {
  await mcpServer.handleGetRequest(req, res);
});

// Graceful shutdown for Heroku
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    console.log('HTTP server closed.');
    
    try {
      await mcpServer.cleanup();
      console.log('MCP server cleanup completed.');
    } catch (error) {
      console.error('Error during MCP cleanup:', error);
    }
    
    // Give Heroku time to drain connections (max 30 seconds)
    setTimeout(() => {
      console.log('Graceful shutdown completed.');
      process.exit(0);
    }, 5000);
  });
};

// Start server
const server = app.listen(port, host, () => {
  console.log(`Alchemy MCP Server (HTTP) listening at http://${host}:${port}/mcp`);
  console.log(`Health check available at http://${host}:${port}/health`);
});

// Heroku shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

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
