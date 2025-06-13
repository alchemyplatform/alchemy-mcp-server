// This file stores web3 related constants such as addresses, token definitions, ETH currency references and ABI's

import { Token } from '@uniswap/sdk-core'

// Addresses

export const POOL_FACTORY_CONTRACT_ADDRESS =
  '0x0227628f3F023bb0B980b67D528571c95c6DaC1c'
export const QUOTER_CONTRACT_ADDRESS =
  '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3'
  export const WETH_CONTRACT_ADDRESS =
  '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'

  export const SWAP_ROUTER_ADDRESS = '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E' // SwapRouter02 on Sepolia for V3 swaps

export const USDC_CONTRACT_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
  
// Currencies and Tokens

export const WETH_TOKEN = new Token(
  11155111,
  WETH_CONTRACT_ADDRESS,
  18,
  'WETH',
  'Wrapped Ether'
)

export const USDC_TOKEN = new Token(
  11155111,
  USDC_CONTRACT_ADDRESS,
  6,
  'USDC',
  'USD//C'
)

// ABI's

export const ERC20_ABI = [
  // Read-Only Functions
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function allowance(address owner, address spender) view returns (uint256)',

  // Authenticated Functions
  'function transfer(address to, uint amount) returns (bool)',
  'function approve(address _spender, uint256 _value) returns (bool)',

  // Events
  'event Transfer(address indexed from, address indexed to, uint amount)',
]

export const WETH_ABI = [
  // Wrap ETH
  'function deposit() payable',

  // Unwrap ETH
  'function withdraw(uint wad) public',
]

// Transactions

export const MAX_FEE_PER_GAS = 2000000000 // 2 GWEI
export const MAX_PRIORITY_FEE_PER_GAS = 2000000000 // 2 GWEI
export const TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER = 2000
