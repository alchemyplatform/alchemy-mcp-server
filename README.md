# Alchemy MCP Server

A Model Context Protocol (MCP) server that enables AI agents to interact with Alchemy's blockchain APIs in a structured way. This allows agents to query blockchain data directly without writing any code.

<a href="https://glama.ai/mcp/servers/@alchemyplatform/alchemy-mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@alchemyplatform/alchemy-mcp-server/badge" alt="Alchemy Server MCP server" />
</a>

## General Usage

This MCP server creates a bridge between AI agents and Alchemy's blockchain APIs, allowing agents to:
- Query token prices and price history
- Get NFT ownership information
- View transaction history
- Check token balances across multiple blockchain networks
- Retrieve asset transfers
- And more!

### Quick Setup

To quickly set up the MCP server, use the following configuration in your MCP config file (typically in Claude Desktop or Cursor settings):

```json
{
  "mcpServers": {
    "alchemy": {
      "command": "npx",
      "args": [
        "-y",
        "@alchemy/mcp-server"
      ],
      "env": {
        "ALCHEMY_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

This configuration allows you to use the server without manually cloning the repository.

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
   - Gets historical price data for tokens
   - Example: "Show me BTC price history from Jan 1 to Feb 1, 2023, with daily intervals"

### Multichain Token Methods

4. **fetchTokensOwnedByMultichainAddresses**
   - Gets token balances for addresses across multiple networks
   - Example: "What tokens does 0xabc...123 hold on Ethereum and Base?"

### Transaction History Methods

5. **fetchMultichainWalletAddressTransactionHistory**
   - Gets transaction history for addresses across multiple networks
   - Example: "Show recent transactions for wallet 0xdef...456 on Ethereum"

6. **fetchTransfers**
   - Gets token transfer data for addresses
   - Example: "Show me all ERC-20 transfers to or from 0xghi...789"

### NFT Methods

7. **fetchNftsOwnedByMultichainAddresses**
   - Gets all NFTs owned by addresses
   - Example: "What NFTs does 0xjkl...012 own?"

8. **fetchNftContractDataByMultichainAddress**
   - Gets NFT contract data for addresses
   - Example: "What NFT collections does 0xmno...345 have tokens from?"

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
pnpm dev
```

### Building for Production

```bash
pnpm build
pnpm start
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

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License.

## Example Prompts

Here are some example prompts you can use with your AI agent:

```
What's the current price of Bitcoin and Ethereum?

Show me the NFTs owned by the wallet 0x1234...5678 on Ethereum.

What tokens does wallet 0xabcd...6789 hold across Ethereum and Base?

Get me the transaction history for 0x9876...5432 from the last week.

Show me the price history of Ethereum from January 1st to today with daily intervals.
```

## API Reference

For more information about Alchemy's APIs, refer to:
- [Alchemy API Documentation](https://docs.alchemy.com/)