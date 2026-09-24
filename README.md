# Alchemy MCP Server

> [!IMPORTANT]
> **The legacy local MCP server has been retired.** Its source code has been removed from this repository, and the `@alchemy/mcp-server` npm package will stop working on **September 30, 2026**. Use the hosted Alchemy MCP Server at `https://mcp.alchemy.com/mcp` instead.

The hosted Alchemy MCP Server gives AI agents access to Alchemy's blockchain APIs and onchain data. It authenticates via OAuth — just sign in with your Alchemy account when prompted. No API key or local install required.

**Full documentation:** [alchemy.com/docs/alchemy-mcp-server](https://www.alchemy.com/docs/alchemy-mcp-server)

## Setup

| Client              | Setup                                                                              |
| ------------------- | ---------------------------------------------------------------------------------- |
| **Claude Code**     | `claude mcp add alchemy --transport http https://mcp.alchemy.com/mcp`              |
| **Codex**           | `codex mcp add alchemy --url https://mcp.alchemy.com/mcp`                          |
| **Cursor**          | Add to `~/.cursor/mcp.json` or `.cursor/mcp.json` — see JSON config below          |
| **Windsurf**        | Add to `~/.codeium/windsurf/mcp_config.json` — see JSON config below               |
| **VS Code Copilot** | Add to `.vscode/mcp.json` — see JSON config below                                  |
| **Claude Desktop**  | Add to `claude_desktop_config.json` — see JSON config below                        |
| **Cline**           | Open `Cline: MCP Servers` from the VS Code command palette — see JSON config below |

<details>
<summary>JSON config for Cursor / Windsurf / Claude Desktop / Cline</summary>

```json
{
  "mcpServers": {
    "alchemy": {
      "type": "streamable-http",
      "url": "https://mcp.alchemy.com/mcp"
    }
  }
}
```

</details>

<details>
<summary>JSON config for VS Code Copilot</summary>

```json
{
  "servers": {
    "alchemy": {
      "type": "http",
      "url": "https://mcp.alchemy.com/mcp"
    }
  }
}
```

</details>

For any other MCP-compatible client, point it at `https://mcp.alchemy.com/mcp` using Streamable HTTP transport.

## Migrating from the local server

If your MCP config runs the local server through `npx`, like this:

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

replace that entry with the hosted server config for your client from the [Setup](#setup) section above. You can drop `ALCHEMY_API_KEY` from your MCP config; the hosted server signs you in with your Alchemy account instead.
