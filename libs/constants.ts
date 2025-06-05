// This file stores web3 related constants such as addresses, token definitions, ETH currency references and ABI's

import { ChainId, Token } from '@uniswap/sdk-core'

// Addresses

export const POOL_FACTORY_CONTRACT_ADDRESS =
  '0x0227628f3F023bb0B980b67D528571c95c6DaC1c'
// V2 contract for sepolia. Looks like errors in txns. Need to test if it even works.
// Do we need to a quote for each token pair?
  export const QUOTER_CONTRACT_ADDRESS =
  '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3'

// Currencies and Tokens

export const WETH_TOKEN = new Token(
  ChainId.SEPOLIA,
  '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
  18,
  'WETH',
  'Wrapped Ether'
)

export const USDC_TOKEN = new Token(
  ChainId.SEPOLIA,
  '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  6,
  'USDC',
  'USD//C'
)
