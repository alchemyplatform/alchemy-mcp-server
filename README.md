# Alchemy MCP Server (Legacy — Not Actively Maintained)

This open-source Model Context Protocol (MCP) server runs Alchemy's blockchain APIs locally via STDIO. **New users should use the [hosted Alchemy MCP Server](https://www.alchemy.com/docs/alchemy-mcp-server) instead.**

<a href="https://glama.ai/mcp/servers/@alchemyplatform/alchemy-mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@alchemyplatform/alchemy-mcp-server/badge" alt="Alchemy Server MCP server" />
</a>

## Remote MCP Server (Recommended)

The fastest way to get started is to connect to the hosted remote server at `https://mcp.alchemy.com/mcp`. It authenticates via OAuth — just sign in with your Alchemy account when prompted. No API key or local install required.

**Full documentation:** [alchemy.com/docs/alchemy-mcp-server](https://www.alchemy.com/docs/alchemy-mcp-server)

> **Legacy notice:** The hosted [Alchemy MCP Server](https://www.alchemy.com/docs/alchemy-mcp-server) at `https://mcp.alchemy.com/mcp` is the recommended and actively maintained MCP server. This repository contains the legacy local STDIO server, is not actively maintained, and may lag behind the hosted server's tool coverage and behavior. Alchemy plans to sunset this repository; new users should connect to the hosted server instead.

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

## Local STDIO Server

> **Legacy:** This section documents the open-source local STDIO server. It is not actively maintained. Use the [hosted server](#remote-mcp-server-recommended) unless you specifically need the `@alchemy/mcp-server` npm package or local development workflow.

This MCP server creates a bridge between AI agents and Alchemy's blockchain APIs, allowing agents to:

- Query token prices and price history (including flexible time frame queries)
- Get NFT ownership information and contract data
- View transaction history across multiple networks
- Check token balances across multiple blockchain networks
- Retrieve detailed asset transfers with filtering
- Send transactions via Smart Contract Accounts (**requires configured wallet agent server**)
- Execute token swaps via DEX protocols (**requires configured wallet agent server**)
- And more!

### Quick Setup

To quickly set up the MCP server, use the following configuration in your MCP config file (typically in Claude Desktop or Cursor settings):

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

This configuration allows you to use the server without manually cloning the repository.

### Environment Variables

The MCP server requires the following environment variable:

- `ALCHEMY_API_KEY` - Your Alchemy API key (required for all blockchain data queries)

**For transaction and swap functionality**, you must also configure:

- `AGENT_WALLET_SERVER` - URL of a configured wallet agent server that handles Smart Contract Account operations

⚠️ **Important**: The `sendTransaction` and `swap` methods will not function without a properly configured wallet agent server. These methods require external wallet infrastructure to handle signing and broadcasting transactions.

## Available Methods

You can prompt your AI agent to use the following methods:

### Token Price Methods

1. **fetchTokenPriceBySymbol**
   - Gets current price data for tokens by symbol
   - Example: "What's the current price of ETH and BTC?"

2. **fetchTokenPriceByAddress**
   - Gets current price data for tokens by contract address
   - Example: "What's the price of the token at address 0x1234...5678 on Ethereum mainnet?"

3. **fetchTokenPriceHistoryBySymbol**
   - Gets historical price data for tokens with specific date ranges
   - Example: "Show me BTC price history from Jan 1 to Feb 1, 2023, with daily intervals"

4. **fetchTokenPriceHistoryByTimeFrame**
   - Gets historical price data using flexible time frames or natural language
   - Example: "Show me ETH price for the last week" or "Get BTC price for the past 30 days"

### Multichain Token Methods

5. **fetchTokensOwnedByMultichainAddresses**
   - Gets token balances for addresses across multiple networks
   - Example: "What tokens does 0xabc...123 hold on Ethereum and Base?"

### Transaction History Methods

6. **fetchAddressTransactionHistory**
   - Gets transaction history for addresses across multiple networks
   - Example: "Show recent transactions for wallet 0xdef...456 on Ethereum"

7. **fetchTransfers**
   - Gets detailed asset transfer data with advanced filtering options
   - Example: "Show me all ERC-20 transfers to or from 0xghi...789"

### NFT Methods

8. **fetchNftsOwnedByMultichainAddresses**
   - Gets all NFTs owned by addresses with spam filtering
   - Example: "What NFTs does 0xjkl...012 own?"

9. **fetchNftContractDataByMultichainAddress**
   - Gets NFT contract data for addresses
   - Example: "What NFT collections does 0xmno...345 have tokens from?"

### Transaction Methods

10. **sendTransaction**
    - Sends transactions via Smart Contract Accounts
    - **⚠️ Important**: Requires a configured wallet agent server with `AGENT_WALLET_SERVER` environment variable
    - Example: "Send 0.1 ETH to 0xpqr...678"

### Swap Methods

11. **swap**
    - Executes token swaps via DEX protocols (Uniswap)
    - **⚠️ Important**: Requires a configured wallet agent server with `AGENT_WALLET_SERVER` environment variable
    - Example: "Swap 100 USDC for ETH"

## Local Development

This repository remains available for reference and migration, but is not actively maintained. For new features and the latest tool coverage, use the [hosted Alchemy MCP Server](https://www.alchemy.com/docs/alchemy-mcp-server).

### Installation

1. Clone the repository

```bash
git clone https://github.com/alchemyplatform/alchemy-mcp.git
cd alchemy-mcp
```

2. Install dependencies

```bash
pnpm install
```

### Development

```bash
pnpm watch
```

### Building for Production

```bash
pnpm build
```

### Using the MCP Inspector for Debugging

The MCP Inspector helps you debug your MCP server by providing a visual interface to test your methods:

```bash
pnpm inspector
```

This will start the MCP Inspector which you can access in your browser. It allows you to:

- See all available methods
- Test methods with different parameters
- View the response data
- Debug issues with your MCP server

## Contributing

This repository is not actively maintained. Pull requests for security fixes or migration-related improvements may be considered, but new features should target the hosted server instead. For major changes, please open an issue first.

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License.

## Example Prompts

Here are some example prompts you can use with your AI agent:

```
What's the current price of Bitcoin and Ethereum?

Show me the NFTs owned by the wallet 0x1234...5678 on Ethereum.

What tokens does wallet 0xabcd...6789 hold across Ethereum and Base?

Get me the transaction history for 0x9876...5432.

Show me the price history of Ethereum from January 1st to today with daily intervals.

Get me Bitcoin price data for the last week with hourly intervals.

Show me ETH price performance for the past month.

What ERC-20 transfers happened to address 0x1234...5678 in the last 100 blocks?
```

## API Reference

For more information about Alchemy's APIs, refer to:

- [Alchemy API Documentation](https://docs.alchemy.com/)
