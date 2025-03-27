# Alchemy MCP Server

An MCP (Model Context Protocol) server for Alchemy blockchain APIs. This allows AI assistants like Claude to interact with Alchemy's blockchain APIs in a structured way.

## Currently Supported APIs

- NFT API Ownership Endpoints:
  - `getNFTsForOwner` - Get all NFTs owned by an address
  - `getOwnersForNFT` - Get all owners of a specific NFT
  - `getOwnersForCollection` - Get all owners of a collection
  - `isHolderOfCollection` - Check if an address owns NFTs in a collection

## Installation

1. Clone the repository
2. Install dependencies
```bash
npm install
```
3. Create a `.env` file from the example
```bash
cp .env.example .env
```
4. Add your Alchemy API key to the `.env` file

## Development

```bash
npm run dev
```

## Building for Production

```bash
npm run build
npm start
```



## Using with Claude Desktop/Cursor

To use this MCP server with Claude Desktop, add the following to your Claude Desktop or Cursor MCP configuration:

```json
{
  "mcpServers": {
    "alchemy": {
      "command": "npx",
      "args": ["tsx", "path/to/alchemy-mpc/src/index.ts"],
      "env": {
        "ALCHEMY_API_KEY": "YOUR_API_KEY",
        "ALCHEMY_BASE_URL": "https://eth-mainnet.g.alchemy.com/nft/v3/"
      }
    }
  }
}
```

## Example Queries

1. Get NFTs owned by an address:

```
Can you show me all NFTs owned by 0x123456789...?
```

2. Check if an address owns NFTs from a collection:

```
Does the wallet 0xabc... own any NFTs from the collection 0xdef...?
```

## API Reference

For more information about Alchemy's APIs, refer to:
- [Alchemy NFT API Documentation](https://docs.alchemy.com/reference/nft-api-quickstart)

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[ISC](LICENSE) 