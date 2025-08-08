#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "../server/createMcpServer.js";

async function run() {
  const transport = process.env.MCP_TRANSPORT || "stdio";

  if (transport === "http") {
    const { bootHttpServer } = await import("../server/http.js");
    await bootHttpServer();
    return;
  }

  const server = createMcpServer();
  const stdio = new StdioServerTransport();
  try {
    await server.connect(stdio);
    console.error("Alchemy MCP Server is running on stdio");
  } catch (error) {
    console.error("Error during server connection:", error);
    if (error instanceof Error) {
      console.error("Detailed error message:", error.message);
    }
    console.error(
      "Possible causes: network issues, incorrect configuration, or server not reachable."
    );
    console.error("Consider checking the server logs and configuration.");
    process.exit(1);
  }
}

run().catch((error) => {
  console.error("Fatal error in run():", error);
  process.exit(1);
});
