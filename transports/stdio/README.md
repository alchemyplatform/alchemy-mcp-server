## Alchemy MCP Server — stdio transport

This package provides the stdio transport for the Alchemy MCP server. It lets MCP-compatible clients (Claude Desktop, Cursor, MCP Inspector, etc.) call Alchemy-powered blockchain tools over standard input/output.

### Quick start (Claude Desktop / Cursor config)

Add the server to your MCP config:

```json
{
  "mcpServers": {
    "alchemy": {
      "command": "npx",
      "args": ["-y", "@alchemy/mcp-server"],
      "env": {
        "ALCHEMY_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

This runs the stdio server via its published binary and connects your client over stdio.

### Environment variables

- **ALCHEMY_API_KEY**: Required. Your Alchemy API key for all data queries.
- **AGENT_WALLET_SERVER**: Optional, but required for wallet actions like `sendTransaction` and `swap`.

### Local development

From the repo root:

```bash
pnpm install
```

This installs all dependencies across the monorepo, including the shared core package.

Then from this package directory (`transports/stdio`):

```bash
# Hot-reload development build
pnpm dev

# Production build
pnpm build
```

The stdio transport uses proper workspace dependencies to import the shared core package (`@alchemy/mcp-core`). During development, the build process automatically bundles the core functionality into the final stdio package.

#### MCP client config for local development (stdio via tsx)

Add this to your MCP config to run the stdio server directly from source using `tsx`:

```json
{
  "mcpServers": {
    "alchemy": {
      "command": "npx",
      "args": ["tsx", "/Users/cody/repos/ai/alchemy-mcp/transports/stdio/src/index.ts"],
      "env": {
        "ALCHEMY_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

### MCP Inspector (debugging)

```bash
pnpm build && pnpm inspector
# or
npx @modelcontextprotocol/inspector node dist/index.js
```

The inspector lists all tools, lets you send requests, and view structured results.

### Available tools

All blockchain tools exposed by the shared core are available over stdio (token prices and history, multichain balances, transfers, NFTs, and wallet actions). For the full, up-to-date list with examples, see the root project README.

- Root docs: `../../README.md`

### CLI

You can run the server directly (stdio):

```bash
npx mcp-server-alchemy
```

### License

MIT


