import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json' with { type: 'json' }  
import { computePoolAddress } from '@uniswap/v3-sdk'
import { ethers } from 'ethers'

import { CurrentConfig } from './config.js'
import { POOL_FACTORY_CONTRACT_ADDRESS } from './constants.js'
import { getMainnetProvider, getProvider } from './providers.js'    

interface PoolInfo {
  token0: string
  token1: string
  fee: number
  tickSpacing: number
  sqrtPriceX96: ethers.BigNumber
  liquidity: ethers.BigNumber
  tick: number
}

export async function getPoolInfo(): Promise<PoolInfo> {
  console.error('Getting pool info')
    // Just Alchemy RPC provider for sepolia. Probably don't need if we don't use wallet functions.
//   const provider = getProvider() 
  const provider = getMainnetProvider()
  if (!provider) {
    throw new Error('No provider')
  }

  const currentPoolAddress = computePoolAddress({
    factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
    tokenA: CurrentConfig.tokens.in,
    tokenB: CurrentConfig.tokens.out,
    fee: CurrentConfig.tokens.poolFee,
  })

  const poolContract = new ethers.Contract(
    currentPoolAddress,
    IUniswapV3PoolABI.abi,
    provider
  )

  const [token0, token1, fee, tickSpacing, liquidity, slot0] =
    await Promise.all([
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
      poolContract.tickSpacing(),
      poolContract.liquidity(),
      poolContract.slot0(),
    ])

  console.error('Raw pool data:', {
    token0,
    token1,
    fee: fee.toString(),
    tickSpacing: tickSpacing.toString(),
    liquidity: liquidity.toString(),
    slot0: {
      sqrtPriceX96: slot0[0].toString(),
      tick: slot0[1].toString()
    }
  })

  return {
    token0,
    token1,
    fee,
    tickSpacing,
    liquidity,
    sqrtPriceX96: slot0[0],
    tick: slot0[1],
  }
}
