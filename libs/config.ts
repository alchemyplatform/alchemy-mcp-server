import { Token } from '@uniswap/sdk-core'
import { FeeAmount } from '@uniswap/v3-sdk'
import { USDC_TOKEN, WETH_TOKEN } from './constants.js'

// Inputs that configure this example to run
export interface ExampleConfig {
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
  rpc: {
    local: 'http://localhost:8545',
    mainnet: `https://eth-sepolia.g.alchemy.com/v2/<ALCHEMY_API_KEY>`,
  },
  tokens: {
    in: WETH_TOKEN,
    amountIn: 0.001,
    out: USDC_TOKEN,
    poolFee: FeeAmount.MEDIUM,
  },
}
