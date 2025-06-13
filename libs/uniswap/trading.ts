import {
    Currency,
    CurrencyAmount,
    Token,
    TradeType,
  } from '@uniswap/sdk-core'
  import {
    Pool,
    Route,
    SwapQuoter,
    Trade,
  } from '@uniswap/v3-sdk'
  import { ethers } from 'ethers'
  import JSBI from 'jsbi'
  
  import { CurrentConfig } from './config.js'
  import {
    QUOTER_CONTRACT_ADDRESS,
  } from './constants.js'
  import { getPoolInfo } from './pool.js'
  import {
    getMainnetProvider,
  } from './providers.js'
  import { fromReadableAmount } from './utils.js'
  
  export type TokenTrade = Trade<Token, Token, TradeType>
  
  export async function createTrade(): Promise<TokenTrade> {
    console.error('Creating trade')
    const poolInfo = await getPoolInfo() // ✅
  
    console.error('Pool Info:', {
      sqrtPriceX96: poolInfo.sqrtPriceX96.toString(),
      liquidity: poolInfo.liquidity.toString(),
      tick: poolInfo.tick,
      token0: poolInfo.token0,
      token1: poolInfo.token1,
      fee: poolInfo.fee
    })

    // Convert sqrtPriceX96 to JSBI
    const sqrtPriceX96 = JSBI.BigInt(poolInfo.sqrtPriceX96.toString())
    const liquidity = JSBI.BigInt(poolInfo.liquidity.toString())
  
    // Create pool with tokens in the correct order based on pool info
    const pool = new Pool(
      poolInfo.token0.toLowerCase() === CurrentConfig.tokens.in.address.toLowerCase() 
        ? CurrentConfig.tokens.in 
        : CurrentConfig.tokens.out,
      poolInfo.token1.toLowerCase() === CurrentConfig.tokens.out.address.toLowerCase() 
        ? CurrentConfig.tokens.out 
        : CurrentConfig.tokens.in,
      CurrentConfig.tokens.poolFee,
      sqrtPriceX96,
      liquidity,
      poolInfo.tick
    )
    console.error('pool', JSON.stringify(pool, null, 2))
  
    const swapRoute = new Route(
      [pool],
      CurrentConfig.tokens.in,
      CurrentConfig.tokens.out
    )
  
    const amountOut = await getOutputQuote(swapRoute) // ✅
  
    const uncheckedTrade = Trade.createUncheckedTrade({
      route: swapRoute,
      inputAmount: CurrencyAmount.fromRawAmount(
        CurrentConfig.tokens.in,
        fromReadableAmount(
          CurrentConfig.tokens.amountIn,
          CurrentConfig.tokens.in.decimals
        ).toString()
      ),
      outputAmount: CurrencyAmount.fromRawAmount(
        CurrentConfig.tokens.out,
        amountOut[0].toString()
      ),
      tradeType: TradeType.EXACT_INPUT,
    })
  
    return uncheckedTrade
  }
  
  // Helper Quoting and Pool Functions
  
  async function getOutputQuote(route: Route<Currency, Currency>) {
    const provider = getMainnetProvider()
  
    if (!provider) {
      throw new Error('Provider required to get pool state')
    }
  
    const { calldata } = await SwapQuoter.quoteCallParameters(
      route,
      CurrencyAmount.fromRawAmount(
        CurrentConfig.tokens.in,
        fromReadableAmount(
          CurrentConfig.tokens.amountIn,
          CurrentConfig.tokens.in.decimals
        ).toString()
      ),
      TradeType.EXACT_INPUT,
      {
        useQuoterV2: true,
      }
    )
  
    const quoteCallReturnData = await provider.call({
      to: QUOTER_CONTRACT_ADDRESS,
      data: calldata,
    })
  
    return ethers.utils.defaultAbiCoder.decode(['uint256'], quoteCallReturnData)
  }
  