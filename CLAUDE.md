# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development**
- `pnpm install` - Install dependencies
- `pnpm build` - Build TypeScript to dist/ directory
- `pnpm watch` - Watch mode for development
- `pnpm inspector` - Launch MCP Inspector for debugging tools
- `node --test tests/*.test.ts --loader=tsx/esm` - Run tests

**Build System**
- Uses TypeScript with ES modules (`"type": "module"`)
- Outputs to `dist/` directory
- Entry point: `dist/index.js`
- Build process includes `shx chmod +x dist/*.js` for executable permissions

## Architecture

This is an MCP (Model Context Protocol) server that provides blockchain data access through Alchemy APIs. The codebase follows a modular structure:

**Core Components:**
- `index.ts` - Main MCP server with tool definitions using Zod schemas
- `api/alchemyApi.ts` - Core API client with blockchain data fetching logic
- `api/alchemyClients.ts` - HTTP client creation for different Alchemy services
- `libs/uniswap/` - Uniswap SDK integration for DEX functionality
- `utils/` - Utility functions for data conversion and date handling

**MCP Tool Categories:**
1. **Prices API** - Token price queries by symbol/address, historical data
2. **MultiChain Token API** - Token balances across multiple networks
3. **Transaction History API** - Wallet transaction data with pagination
4. **Transfers API** - Asset transfer queries with filtering
5. **NFT API** - NFT ownership and contract data
6. **Wallet API** - Transaction sending via Smart Contract Accounts
7. **Swap API** - DEX trading functionality

**Key Dependencies:**
- `@modelcontextprotocol/sdk` - MCP server framework
- `@uniswap/v3-sdk` and related packages - DEX integration
- `@aa-sdk/core` - Account Abstraction for wallet operations
- `viem` and `ethers` - Ethereum interaction libraries
- `zod` - Schema validation for tool parameters

**Environment Setup:**
- Requires `ALCHEMY_API_KEY` environment variable
- Uses `.cursor/mcp.json` for local MCP server configuration
- Supports multiple blockchain networks (Ethereum, Base, etc.)

**Error Handling:**
All MCP tools follow consistent error handling pattern with structured error responses and console logging.

**Data Processing:**
- Automatic timestamp to date conversion for transaction data
- Wei to ETH conversion for readable values
- Hex balance to decimal conversion utilities