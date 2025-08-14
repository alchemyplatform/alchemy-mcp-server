import express from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "@alchemy/mcp-core/dist/server.js";

function resolveVersion(): string {
  if (process.env.SERVER_VERSION) return process.env.SERVER_VERSION; // override supported [[memory:5498526]]
  return "0.0.0";
}

const app = express();
app.use(express.json());

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "127.0.0.1";
const enableDnsRebindingProtection = (process.env.ENABLE_DNS_REBINDING_PROTECTION || "false").toLowerCase() === "true";
const allowedHosts = (process.env.ALLOWED_HOSTS || host)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const transports: Record<string, StreamableHTTPServerTransport> = {};

app.post('/api/index', async (req, res) => {
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

    const version = resolveVersion();
    const sessionServer = createServer(version);
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

app.get('/api/index', handleSessionRequest);
app.delete('/api/index', handleSessionRequest);

app.listen(port, host, () => {
  console.error(`Alchemy MCP Server (HTTP) listening at http://${host}:${port}/api/index`);
});


