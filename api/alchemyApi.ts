import dotenv from 'dotenv';
dotenv.config();
import { createPricesClient, createMultiChainTokenClient, createMultiChainTransactionHistoryClient, createAlchemyJsonRpcClient, createNftClient } from './alchemyClients.js';
import { TokenPriceBySymbol, TokenPriceByAddress, TokenPriceByAddressPair, TokenPriceHistoryBySymbol, MultiChainTokenByAddress, MultiChainTransactionHistoryByAddress, AssetTransfersParams, NftsByAddressParams, NftContractsByAddressParams, AddressPair, SendTransactionParams, SwapParams, GasPriceParams } from '../types/types.js';
import convertHexBalanceToDecimal from '../utils/convertHexBalanceToDecimal.js';
import { convertWeiToGwei } from '../utils/ethConversions.js';

const AGENT_WALLET_SERVER = process.env.AGENT_WALLET_SERVER;

// Helper functions for gas analysis
function assessNetworkCongestion(gasUsedRatio: number[]): string {
  if (!gasUsedRatio || gasUsedRatio.length === 0) return 'unknown';
  const avgUsage = gasUsedRatio.reduce((a, b) => a + b, 0) / gasUsedRatio.length;
  if (avgUsage > 0.9) return 'high';
  if (avgUsage > 0.7) return 'medium';
  if (avgUsage > 0.3) return 'low';
  return 'very low';
}

function getGasRecommendation(baseFeeGwei: number, priorityFeesGwei: number[]): string {
  if (baseFeeGwei < 10) return 'Good time to transact - low gas fees';
  if (baseFeeGwei < 30) return 'Moderate gas fees - consider urgency';
  if (baseFeeGwei < 50) return 'High gas fees - only for urgent transactions';
  return 'Very high gas fees - consider waiting for lower fees';
}

export const alchemyApi = {
  
  async getTokenPriceBySymbol(params: TokenPriceBySymbol) {
    try {
      const client = createPricesClient();
      
      const queryParams = new URLSearchParams();
      params.symbols.forEach(symbol => {
        queryParams.append('symbols', symbol.toUpperCase());
      });
      
      const response = await client.get(`/by-symbol?${queryParams}`);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      throw error;
    }
  },
  
  async getTokenPriceByAddress(params: TokenPriceByAddress) {
    try {
      const client = createPricesClient();
      
      const response = await client.post('/by-address', {
        addresses: params.addresses.map((pair: TokenPriceByAddressPair) => ({
          address: pair.address,
          network: pair.network
        }))
      });

      console.log('Successfully fetched token price:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching token price:', error);
      throw error;
    }
  },
  
  async getTokenPriceHistoryBySymbol(params: TokenPriceHistoryBySymbol) {
    console.log('Fetching token price history for symbol:', params.symbol);
    try {
      const client = createPricesClient();
      
      const response = await client.post('/historical', {
        ...params
      });

      console.log('Successfully fetched token price history:', response.data);
      return response.data;  
    } catch (error) {
      console.error('Error fetching token price history:', error);
      throw error;
    }
  },
  
  async getTokensByMultichainAddress(params: MultiChainTokenByAddress) {
    try {
      const client = createMultiChainTokenClient();
      
      const response = await client.post('/by-address', {
        addresses: params.addresses.map((pair: AddressPair) => ({
          address: pair.address,
          networks: pair.networks
        }))
      });

      const responseData = convertHexBalanceToDecimal(response);
      return responseData;
    } catch (error) {
      console.error('Error fetching token data:', error);
      throw error;
    }
  },
  
  async getTransactionHistoryByMultichainAddress(params: MultiChainTransactionHistoryByAddress) {
    try {
      const { addresses, ...otherParams } = params;
      const client = createMultiChainTransactionHistoryClient();
      
      const response = await client.post('/by-address', {
        addresses: params.addresses.map((pair: AddressPair) => ({
          address: pair.address,  
          networks: pair.networks
        })),
        ...otherParams
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  },

  async getAssetTransfers(params: AssetTransfersParams) {
    const { network, ...otherParams } = params;
    try {
      const client = createAlchemyJsonRpcClient(network);
      
      const response = await client.post('', {
        method: "alchemy_getAssetTransfers",
        params: [{
          ...otherParams
        }]
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching asset transfers:', error);
      throw error;
    }
  },

  async getNftsForAddress(params: NftsByAddressParams) {
    try {
      const client = createNftClient();
      
      const response = await client.post('/by-address', { 
        ...params
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching NFTs for address:', error);
      throw error;
    }
  },

  async getNftContractsByAddress(params: NftContractsByAddressParams) {
    try {
      const client = createNftClient();
      
      const response = await client.post('/by-address', {
        ...params
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching NFT contracts by address:', error);
      throw error;
    }
  },

  async sendTransaction(params: SendTransactionParams) {
    const { ownerScaAccountAddress, signerAddress, toAddress, value, callData } = params;
    try {
      const response = await fetch(`${AGENT_WALLET_SERVER}/transactions/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerScaAccountAddress,
          signerAddress,
          toAddress,
          value,
          callData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  },
  
  async swap(params: SwapParams) {
    const { ownerScaAccountAddress, signerAddress } = params;
    console.error('SWAPPING TOKENS');
    try {
      const response = await fetch(`${AGENT_WALLET_SERVER}/transactions/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerScaAccountAddress,
          signerAddress
        })
      });

      console.error('SWAPPING TOKENS RESPONSE', response);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error in swap:', error);
      throw error;
    }
  },

  async getGasPrice(params: GasPriceParams) {
    const { network } = params;
    try {
      const client = createAlchemyJsonRpcClient(network);
      
      // Get legacy gas price
      const gasPriceResponse = await client.post('', {
        method: "eth_gasPrice",
        params: []
      });

      // Get EIP-1559 fee data (more modern approach)
      const feeHistoryResponse = await client.post('', {
        method: "eth_feeHistory",
        params: ["0x4", "latest", [10, 50, 90]] // Last 4 blocks, 10th, 50th, 90th percentiles
      });

      const gasPriceHex = gasPriceResponse.data.result;
      const gasPriceGwei = convertWeiToGwei(gasPriceHex);
      const feeHistory = feeHistoryResponse.data.result;

      // Calculate suggested fees based on fee history
      const baseFeePerGas = feeHistory.baseFeePerGas?.[feeHistory.baseFeePerGas.length - 1];
      const priorityFees = feeHistory.reward?.[feeHistory.reward.length - 1] || [];

      let suggestions = {};
      let baseFeeGwei = 0;
      let priorityFeesGwei: number[] = [];
      
      if (baseFeePerGas && priorityFees.length > 0) {
        baseFeeGwei = convertWeiToGwei(baseFeePerGas);
        priorityFeesGwei = priorityFees.map((fee: string) => convertWeiToGwei(fee));
        
        // More conservative and realistic priority fee suggestions
        const lowPriority = Math.max(priorityFeesGwei[0] || 0, 0);
        const normalPriority = Math.max(priorityFeesGwei[1] || 0, 0.01); // At least 0.01 Gwei
        const fastPriority = Math.max(priorityFeesGwei[2] || 0, 0.1); // At least 0.1 Gwei
        
        suggestions = {
          slow: {
            baseFee: `${baseFeeGwei.toFixed(3)} Gwei`,
            priorityFee: `${lowPriority.toFixed(3)} Gwei`,
            total: `${(baseFeeGwei + lowPriority).toFixed(3)} Gwei`,
            estimatedTime: "~60 seconds"
          },
          normal: {
            baseFee: `${baseFeeGwei.toFixed(3)} Gwei`,
            priorityFee: `${normalPriority.toFixed(3)} Gwei`,
            total: `${(baseFeeGwei + normalPriority).toFixed(3)} Gwei`,
            estimatedTime: "~30 seconds"
          },
          fast: {
            baseFee: `${baseFeeGwei.toFixed(3)} Gwei`,
            priorityFee: `${fastPriority.toFixed(3)} Gwei`,
            total: `${(baseFeeGwei + fastPriority).toFixed(3)} Gwei`,
            estimatedTime: "~15 seconds"
          }
        };
      }

      return {
        network,
        timestamp: new Date().toISOString(),
        currentBlock: feeHistory.oldestBlock ? parseInt(feeHistory.oldestBlock, 16) + 3 : 'unknown',
        networkCongestion: assessNetworkCongestion(feeHistory.gasUsedRatio),
        legacy: {
          gasPriceHex,
          gasPriceGwei: `${gasPriceGwei.toFixed(6)} Gwei`,
          gasPriceWei: parseInt(gasPriceHex, 16).toString()
        },
        eip1559: suggestions,
        analysis: {
          avgGasUsed: feeHistory.gasUsedRatio ? 
            `${(feeHistory.gasUsedRatio.reduce((a: number, b: number) => a + b, 0) / feeHistory.gasUsedRatio.length * 100).toFixed(1)}%` : 'unknown',
          recommendation: getGasRecommendation(baseFeeGwei, priorityFeesGwei)
        },
        raw: {
          feeHistory: feeHistory
        }
      };
    } catch (error) {
      console.error('Error fetching gas price:', error);
      throw error;
    }
  }
};


