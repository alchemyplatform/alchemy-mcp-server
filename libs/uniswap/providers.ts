import { ethers, providers } from 'ethers'

import { CurrentConfig } from './config.js'

// Single copies of provider and wallet
const mainnetProvider = new ethers.providers.JsonRpcProvider(
  CurrentConfig.rpc.mainnet
)

export function getMainnetProvider(): providers.Provider {
  return mainnetProvider
}

