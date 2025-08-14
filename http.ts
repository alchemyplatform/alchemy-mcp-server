#!/usr/bin/env node

import express from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "./server.js";

async function run() {
  const port = Number(process.env.PORT || 3001);
  const host = process.env.HOST || "127.0.0.1";
  const enableDnsRebindingProtection = (process.env.ENABLE_DNS_REBINDING_PROTECTION || "false").toLowerCase() === "true";
  const allowedHosts = (process.env.ALLOWED_HOSTS || host)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const app = express();
  app.use(express.json());

  const transports: Record<string, StreamableHTTPServerTransport> = {};

  app.post('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport | undefined;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid: string) => {
          transports[sid] = transport as StreamableHTTPServerTransport;
        },
        enableDnsRebindingProtection,
        allowedHosts,
      });

      transport.onclose = () => {
        if (transport && transport.sessionId) delete transports[transport.sessionId as string];
      };

      const sessionServer = createServer();
      await sessionServer.connect(transport);
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null,
      });
      return;
    }

    await transport!.handleRequest(req, res, req.body);
  });

  const handleSessionRequest = async (req: any, res: any) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  };

  app.get('/mcp', handleSessionRequest);
  app.delete('/mcp', handleSessionRequest);

  app.listen(port, host, () => {
    console.error(`Alchemy MCP Server (streamable HTTP) listening at http://${host}:${port}/mcp`);
  });
}

run().catch((error) => {
  console.error("Fatal error while starting HTTP server:", error);
  process.exit(1);
});


