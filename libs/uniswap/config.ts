import { Token } from '@uniswap/sdk-core'
import { FeeAmount } from '@uniswap/v3-sdk'
import dotenv from 'dotenv'
import { USDC_TOKEN, WETH_TOKEN } from './constants.js'

dotenv.config();

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
// Sets if the example should run locally or on chain
export enum Environment {
  LOCAL,
  MAINNET,
  WALLET_EXTENSION,
}

// Inputs that configure this example to run
export interface ExampleConfig {
  env: Environment
  rpc: {
    local: string
    mainnet: string
  }
  tokens: {
    in: Token
    amountIn: number
    out: Token
    poolFee: number
  }
}

// Example Configuration
export const CurrentConfig: ExampleConfig = {
  env: Environment.MAINNET,
  rpc: {
    local: 'http://localhost:8545',
    mainnet: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  },
  tokens: {
    in: WETH_TOKEN,
    amountIn: 0.001,  // 0.001 WETH
    out: USDC_TOKEN,
    poolFee: FeeAmount.LOW,  // Using LOW (0.05%) pool as it has the most liquidity
  },
}
