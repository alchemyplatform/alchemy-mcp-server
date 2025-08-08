import express, { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { createMcpServer } from "./createMcpServer.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

type BootResult = {
  app: ReturnType<typeof express>;
  host: string;
  port: number;
  path: string;
};

function parseAllowedOrigins(port: number): Set<string> {
  const defaults = new Set<string>([
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
  ]);
  const fromEnv = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  for (const origin of fromEnv) defaults.add(origin);
  return defaults;
}

function dnsRebindingProtection(allowedOrigins: Set<string>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers["origin"] as string | undefined;
    if (!origin) {
      // Some CLI clients do not send an Origin header.
      next();
      return;
    }
    if (!allowedOrigins.has(origin)) {
      res.status(403).send("Forbidden");
      return;
    }
    next();
  };
}

export async function bootHttpServer(): Promise<BootResult> {
  const host = process.env.HOST || "127.0.0.1";
  const port = Number(process.env.PORT || 3000);
  const path = process.env.MCP_HTTP_PATH || "/mcp";

  const app = express();
  app.use(express.json({ type: ["application/json", "application/json-rpc"] }));

  const allowedOrigins = parseAllowedOrigins(port);
  app.use(path, dnsRebindingProtection(allowedOrigins));

  // Session-aware transports keyed by MCP-Session-Id
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  // Handle POST (client->server JSON-RPC)
  app.post(path, async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport | undefined = sessionId
      ? transports[sessionId]
      : undefined;

    if (!transport) {
      if (!isInitializeRequest(req.body)) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: No valid session ID provided" },
          id: null,
        });
        return;
      }

      // Create new transport + server for a new session
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          transports[newSessionId] = transport as StreamableHTTPServerTransport;
        },
        // We rely on our Origin check middleware for DNS rebinding mitigation.
        // enableDnsRebindingProtection: true,
        // allowedHosts: [host],
      });

      const server = createMcpServer();
      transport.onclose = () => {
        if (transport?.sessionId) delete transports[transport.sessionId];
        try { server.close(); } catch {}
      };
      await server.connect(transport);
    }

    await transport.handleRequest(req, res, req.body);
  });

  // Handle GET (server->client via SSE) and DELETE (session termination)
  const handleSessionRequest = async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  };

  app.get(path, handleSessionRequest);
  app.delete(path, handleSessionRequest);

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).send("ok");
  });

  await new Promise<void>((resolve) => {
    app.listen(port, host, () => {
      console.error(`Alchemy MCP Server (http) listening on http://${host}:${port}${path}`);
      resolve();
    });
  });

  return { app, host, port, path };
}


