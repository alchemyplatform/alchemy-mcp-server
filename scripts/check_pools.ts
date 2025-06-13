import { ethers } from 'ethers'
import { computePoolAddress, FeeAmount } from '@uniswap/v3-sdk'
import { POOL_FACTORY_CONTRACT_ADDRESS } from '../libs/uniswap/constants.js'
import { WETH_TOKEN, USDC_TOKEN } from '../libs/uniswap/constants.js'
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json' assert { type: 'json' }
import dotenv from 'dotenv'

dotenv.config();

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

async function checkPools() {
  const provider = new ethers.providers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`)
  
  const feeTiers = [
    { fee: FeeAmount.LOWEST, name: 'LOWEST (0.01%)' },
    { fee: FeeAmount.LOW, name: 'LOW (0.05%)' },
    { fee: FeeAmount.MEDIUM, name: 'MEDIUM (0.3%)' },
    { fee: FeeAmount.HIGH, name: 'HIGH (1%)' }
  ]

  console.log('Checking WETH/USDC pools on Sepolia...')
  console.log('WETH address:', WETH_TOKEN.address)
  console.log('USDC address:', USDC_TOKEN.address)
  console.log('Factory address:', POOL_FACTORY_CONTRACT_ADDRESS)
  console.log('---')

  for (const { fee, name } of feeTiers) {
    const poolAddress = computePoolAddress({
      factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
      tokenA: WETH_TOKEN,
      tokenB: USDC_TOKEN,
      fee
    })

    console.log(`\nChecking ${name} pool at ${poolAddress}`)
    
    try {
      const poolContract = new ethers.Contract(
        poolAddress,
        IUniswapV3PoolABI.abi,
        provider
      )

      const [token0, token1, poolFee, liquidity] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
        poolContract.liquidity()
      ])

      console.log('Pool exists!')
      console.log('Token0:', token0)
      console.log('Token1:', token1)
      console.log('Fee:', poolFee.toString())
      console.log('Liquidity:', liquidity.toString())
    } catch (e) {
      console.log('Pool does not exist or has no liquidity')
    }
  }
}

checkPools().catch(console.error) 
