# Alchemy MCP Server

A Model Context Protocol (MCP) server that enables AI assistants like Claude to interact with Alchemy's blockchain APIs in a structured way. This allows you to query blockchain data directly through your AI assistant without writing any code.

## What This Project Does

This MCP server creates a bridge between AI assistants and Alchemy's blockchain APIs, allowing you to:
- Query token prices and price history
- Get NFT ownership information
- View transaction history
- Check token balances across multiple blockchain networks
- Retrieve asset transfers
- And more!

## Installation

1. Clone the repository
```bash
git clone https://github.com/alchemyplatform/alchemy-mcp.git
cd alchemy-mcp
```

2. Install dependencies
```bash
npm install
# or
pnpm install
```

3. Create a `.env` file from the example
```bash
cp .env.example .env
```

4. Add your Alchemy API key to the `.env` file
```
ALCHEMY_API_KEY=your_api_key_here
```

## Development

```bash
npm run dev
# or
pnpm dev
```

## Building for Production

```bash
npm run build
npm start
# or
pnpm build
pnpm start
```

## Using the MCP Inspector for Debugging

The MCP Inspector helps you debug your MCP server by providing a visual interface to test your methods:

```bash
npm run inspector
# or
pnpm inspector
```

This will start the MCP Inspector which you can access in your browser. It allows you to:
- See all available methods
- Test methods with different parameters
- View the response data
- Debug issues with your MCP server

## Adding an MCP Server to Your LLM Client

### For Claude Desktop/Cursor

Add the following to your Claude Desktop or Cursor MCP configuration (typically in `~/.config/claude-desktop/mcp.json` or Cursor settings):

```json
{
  "mcpServers": {
    "alchemy": {
      "command": "npx",
      "args": [
        "tsx",
        "path/to/alchemy-mcp/index.js"],
      "env": {
        "ALCHEMY_API_KEY": "YOUR_API_KEY",
      }
    }
  }
}
```

### For Other LLM Clients

Check your LLM client's documentation for how to add external MCP servers. You'll typically need to provide:
- A name for the server
- The command to start the server
- Any environment variables needed

## Available Methods

You can prompt your AI assistant to use the following methods:

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

## Example Prompts

Here are some example prompts you can use with your AI assistant:

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

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE) 