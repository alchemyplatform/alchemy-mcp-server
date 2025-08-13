#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

// Note: HTTP transport import path may vary by SDK version. Using http.js export if available.
// We lazy-import to avoid bundling issues if not used.

function parseArgs(argv: string[]) {
  const args = new Set(argv.slice(2));
  const transportArg = argv.find((a) => a.startsWith("--transport="));
  const explicit = transportArg ? transportArg.split("=")[1] : undefined;
  const http = args.has("--http");
  const stdio = args.has("--stdio");
  return explicit ?? (http ? "http" : stdio ? "stdio" : "stdio");
}

async function run() {
  const transportChoice = parseArgs(process.argv);
  const server = createServer();

  if (transportChoice === "http") {
    try {
      const expressModule: any = await import("express");
      const express = expressModule.default ?? expressModule;
      const { randomUUID } = await import("node:crypto");
      const { StreamableHTTPServerTransport } = await import("@modelcontextprotocol/sdk/server/streamableHttp.js");
      const { isInitializeRequest } = await import("@modelcontextprotocol/sdk/types.js");

      const port = Number(process.env.PORT || 3001);
      const host = process.env.HOST || "127.0.0.1";
      const enableDnsRebindingProtection = (process.env.ENABLE_DNS_REBINDING_PROTECTION || "false").toLowerCase() === "true";
      const allowedHosts = (process.env.ALLOWED_HOSTS || host)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const app = express();
      app.use(express.json());

      const transports: Record<string, any> = {};

      app.post('/mcp', async (req: any, res: any) => {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let transport: any;

        if (sessionId && transports[sessionId]) {
          transport = transports[sessionId];
        } else if (!sessionId && isInitializeRequest(req.body)) {
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid: string) => {
              transports[sid] = transport;
            },
            enableDnsRebindingProtection,
            allowedHosts,
          });

          transport.onclose = () => {
            if (transport.sessionId) delete transports[transport.sessionId as string];
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

        await transport.handleRequest(req, res, req.body);
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
      return;
    } catch (err) {
      console.error("HTTP transport requested but not available or Express not installed.");
      console.error("Install 'express' and use an MCP SDK version with 'server/streamableHttp.js', or run with --stdio.");
      console.error("Falling back to stdio...");
    }
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Alchemy MCP Server is running on stdio');
}

run().catch((error) => {
  console.error("Fatal error while starting server:", error);
  process.exit(1);
});
