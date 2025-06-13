import { Token, TradeType } from '@uniswap/sdk-core'
import { Trade } from '@uniswap/v3-sdk'
import { ethers } from 'ethers'
import JSBI from 'jsbi';

const MAX_DECIMALS = 4

export function fromReadableAmount(amount: number, decimals: number) {
  // Convert the amount to a string with the full decimal representation
  const amountStr = amount.toFixed(decimals);
  // Remove the decimal point and convert to BigInt
  const atomicAmount = BigInt(ethers.utils.parseUnits(amountStr, decimals).toString());
  return atomicAmount;
}

export function toReadableAmount(rawAmount: number, decimals: number): string {
  return ethers.utils.formatUnits(rawAmount, decimals).slice(0, MAX_DECIMALS)
}

export function displayTrade(trade: Trade<Token, Token, TradeType>): string {
  return `${trade.inputAmount.toExact()} ${
    trade.inputAmount.currency.symbol
  } for ${trade.outputAmount.toExact()} ${trade.outputAmount.currency.symbol}`
}
