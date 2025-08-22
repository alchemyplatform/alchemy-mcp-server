import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  JSONRPCError,
  JSONRPCNotification,
  InitializeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "@alchemy/mcp-core";

const SESSION_ID_HEADER_NAME = "mcp-session-id";
const JSON_RPC = "2.0";
const HEARTBEAT_INTERVAL = 240000; // 4 minutes (240,000ms)

export class MCPServer {
  // to support multiple simultaneous connections
  transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
  // Track heartbeat timers
  heartbeats: { [sessionId: string]: NodeJS.Timeout } = {};
  // Track connected servers for sending notifications
  servers: { [sessionId: string]: any } = {};

  async handleGetRequest(req: Request, res: Response) {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    
    if (!sessionId || !this.transports[sessionId]) {
      res.status(404).send('Session not found');
      return;
    }

    console.log(`Establishing SSE stream for session ${sessionId}`);
    const transport = this.transports[sessionId];
    try {
        // MCP SDK handles all SSE validation, headers, and setup
        await transport.handleRequest(req, res);
        
        this.startHeartbeat(sessionId);
        
      } catch (error) {
        console.error(`SSE connection failed for session ${sessionId}:`, error);
        res.status(503).send('SSE connection failed');
      }
  }

  async handlePostRequest(req: Request, res: Response) {
    const sessionId = req.headers[SESSION_ID_HEADER_NAME] as string | undefined;
    const apiKey = req.headers['x-api-key'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    try {
      // reuse existing transport
      if (sessionId && this.transports[sessionId]) {
        transport = this.transports[sessionId];
        await transport.handleRequest(req, res, req.body);
        return;
      }

      // Handle initialize requests (with or without session ID)
      if (this.isInitializeRequest(req.body)) {
        if (!apiKey) {
          res.status(401).json({
            jsonrpc: JSON_RPC,
            error: { 
              code: -32001, 
              message: 'Unauthorized: X-API-KEY header is required for Alchemy API access' 
            },
            id: req.body?.id || null,
          });
          return;
        }

        if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
          res.status(401).json({
            jsonrpc: JSON_RPC,
            error: { 
              code: -32001, 
              message: 'Invalid API key format. X-API-KEY must be a non-empty string' 
            },
            id: req.body?.id || null,
          });
          return;
        }

        const newSessionId = sessionId || randomUUID();
        
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId,
        });

        const version = this.resolveVersion();
        const context = { apiKey };
        const server = createServer(version, context);
        
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);

        const finalSessionId = transport.sessionId || newSessionId;
        this.transports[finalSessionId] = transport;
        this.servers[finalSessionId] = server;

        console.log(`Created/recovered session: ${finalSessionId}`);
        return;
      }

      // Handle non-initialize requests with missing session
      if (sessionId && !this.transports[sessionId]) {
        res.status(404).json({
          jsonrpc: JSON_RPC,
          error: { 
            code: -32001, 
            message: 'Session not found. Please reinitialize the connection.' 
          },
          id: req.body?.id || null,
        });
        return;
      }

      res.status(400).json(
        this.createErrorResponse("Bad Request: invalid session ID or method.")
      );
      return;
    } catch (error) {
      console.error("Error handling MCP request:", error);
      res.status(500).json(this.createErrorResponse("Internal server error."));
      return;
    }
  }

  async cleanup() {
    for (const sessionId of Object.keys(this.heartbeats)) {
      this.clearHeartbeat(sessionId);
    }
    
    for (const transport of Object.values(this.transports)) {
      if (typeof (transport as any).close === 'function') {
        (transport as any).close();
      }
    }
    this.transports = {};
    this.servers = {};
  }

  private resolveVersion(): string {
    if (process.env.SERVER_VERSION) return process.env.SERVER_VERSION;
    return "0.0.0";
  }

  private createErrorResponse(message: string): JSONRPCError {
    return {
      jsonrpc: JSON_RPC,
      error: {
        code: -32000,
        message: message,
      },
      id: randomUUID(),
    };
  }

  private isInitializeRequest(body: any): boolean {
    const isInitial = (data: any) => {
      const result = InitializeRequestSchema.safeParse(data);
      return result.success;
    };
    if (Array.isArray(body)) {
      return body.some((request) => isInitial(request));
    }
    return isInitial(body);
  }

  private startHeartbeat(sessionId: string) {
    // Clear any existing heartbeat for this session
    if (this.heartbeats[sessionId]) {
      clearInterval(this.heartbeats[sessionId]);
    }
    
    this.heartbeats[sessionId] = setInterval(async () => {
      const transport = this.transports[sessionId];
      const server = this.servers[sessionId];
      
      if (transport && server) {
        try {
          const heartbeatNotification: JSONRPCNotification = {
            jsonrpc: JSON_RPC,
            method: "notifications/message",
            params: {
              level: "debug",
              data: `Heartbeat ping - ${new Date().toISOString()}`
            }
          };
          
          await transport.send(heartbeatNotification);
          console.log(`SSE heartbeat sent for session ${sessionId}`);
          
        } catch (error) {
          console.error(`Heartbeat failed for session ${sessionId}:`, error);
          this.clearHeartbeat(sessionId);
        }
      } else {
        // Session no longer exists, stop heartbeat
        this.clearHeartbeat(sessionId);
      }
    }, HEARTBEAT_INTERVAL);
    
    console.log(`SSE heartbeat started for session ${sessionId} (4min interval)`);
  }

  private clearHeartbeat(sessionId: string) {
    if (this.heartbeats[sessionId]) {
      clearInterval(this.heartbeats[sessionId]);
      delete this.heartbeats[sessionId];
      console.log(`SSE heartbeat cleared for session ${sessionId}`);
    }
  }
}
