# Alchemy MCP Server

A Model Context Protocol (MCP) server that enables AI agents to interact with Alchemy's blockchain APIs in a structured way. This allows agents to query blockchain data directly without writing any code.

<a href="https://glama.ai/mcp/servers/@alchemyplatform/alchemy-mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@alchemyplatform/alchemy-mcp-server/badge" alt="Alchemy Server MCP server" />
</a>

## General Usage

This MCP server creates a bridge between AI agents and Alchemy's blockchain APIs, allowing agents to:
- Query token prices and price history (including flexible time frame queries)
- Get NFT ownership information and contract data
- View transaction history across multiple networks
- Check token balances across multiple blockchain networks
- Retrieve detailed asset transfers with filtering
- Send transactions via Smart Contract Accounts (**requires configured wallet agent server**)
- Execute token swaps via DEX protocols (**requires configured wallet agent server**)
- And more!

### Quick Setup (npm, stdio only)

To set up the MCP server via npm, add this to your MCP config (Claude Desktop or Cursor):

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

This uses the npm package and runs over stdio. HTTP transport is not exposed via the npm package.

### HTTP transport (development and remote hosting from source)

For development and remote hosting, use the HTTP transport from the source repo:

```bash
# Development
pnpm dev:http

# Build and run HTTP server from source (for remote hosting)
pnpm build && pnpm --filter ./transports/http start
```

HTTP options via env:
- `PORT` (default: 3001)
- `HOST` (default: 127.0.0.1)
- `ENABLE_DNS_REBINDING_PROTECTION` (default: false)
- `ALLOWED_HOSTS` comma-separated list (default: HOST)

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
    - **Parameters**: tokenIn, tokenOut, amountIn, slippageTolerance (optional)
    - Example: "Swap 1.5 WETH for USDC with 1% slippage tolerance"

## Local Development and Open Source Contributions

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
# stdio development (hot reload)
pnpm dev:stdio

# http development (hot reload)
pnpm dev:http
```

### Building for Production

```bash
pnpm build
```

### Using the MCP Inspector for Debugging

The MCP Inspector helps you debug your MCP server by providing a visual interface to test your methods:

```bash
# stdio (npm-compatible)
pnpm inspector:stdio

# http (from source)
pnpm build && npx @modelcontextprotocol/inspector http http://127.0.0.1:3001/api/index
```

This will start the MCP Inspector which you can access in your browser. It allows you to:
- See all available methods
- Test methods with different parameters
- View the response data
- Debug issues with your MCP server

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

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
