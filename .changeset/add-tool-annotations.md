---
"@alchemy/mcp-server": minor
---

Add MCP tool annotations (`readOnlyHint`, `destructiveHint`, `openWorldHint`, `idempotentHint`) to all 97 registered tools.

These annotations are required for ChatGPT App Directory submission and improve the experience in any MCP client by clearly signalling which tools are read-only vs. state-changing, and which can cause irreversible side effects.

- 93 read-only tools (data fetches, simulations, traces) are marked `readOnlyHint: true`.
- `sendTransaction` and `swap` are marked `destructiveHint: true, openWorldHint: true` — they perform irreversible blockchain writes.
- `reportSpam` is marked `openWorldHint: true` — it writes to Alchemy's public spam-classification list.
- `invalidateNFTContractCache` is marked `readOnlyHint: false` — it mutates Alchemy's internal NFT cache.

Two new test cases enforce that every tool declares the three required annotations and that known state-changing tools are not accidentally marked as read-only.
