import dotenv from 'dotenv';
import { createPricesClient, createMultiChainTokenClient, createMultiChainTransactionHistoryClient, createAlchemyJsonRpcClient, createNftClient, createWalletClient } from './alchemyClients.js';
import { TokenPriceBySymbol, TokenPriceByAddress, TokenPriceByAddressPair, TokenPriceHistoryBySymbol, MultiChainTokenByAddress, MultiChainTransactionHistoryByAddress, AssetTransfersParams, NftsByAddressParams, NftContractsByAddressParams, AddressPair, PrepareCallsParams, SendTransactionParams, SendUserOpParams, GetCallsStatusParams } from '../types/types.js';
import convertHexBalanceToDecimal from '../utils/convertHexBalanceToDecimal.js';
import { toHex } from 'viem';
import { sepolia } from 'viem/chains';
import { LocalAccountSigner } from '@aa-sdk/core';
import { convertEthToWei } from '../utils/ethConversions.js';
import { quote } from '../utils/quote.js';
dotenv.config();

const POLICY_ID = '<ALCHEMY_POLICY_ID>';
const CHAIN_ID = toHex(sepolia.id);

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

  async prepareCalls(params: PrepareCallsParams) {
    const { ownerScaAccountAddress, concatHexString, toAddress, value, callData} = params;
    const sentData = callData ? callData : '0x';
    const weiValue = value ? toHex(convertEthToWei(value)) : toHex(0);
    
    try {
      const client = createWalletClient();

      const response = await client.post('', {
        method: "wallet_prepareCalls",
        params: [{
          capabilities: {
            permissions: {
              context: concatHexString
            },
            paymasterService: {
                policyId: POLICY_ID
            }
          },
          calls: [
            {
              to: toAddress,
              value: weiValue,
              data: sentData
            }
          ],
          from: ownerScaAccountAddress,
          chainId: CHAIN_ID
        }]
      });

      console.error('response', response)
      return response.data;

    } catch (error) {
      console.error('Error preparing calls:', error);
      throw error;
    }
  },

  async sendUserOp(params: SendUserOpParams) {
    const { userOpRequest, userOpSignature, concatHexString} = params;
    try {
      const client = createWalletClient();
    const response = await client.post('', {
        method: 'wallet_sendPreparedCalls',
        params: [
          {
            type: 'user-operation-v070',
            data: userOpRequest.result.data,
            capabilities: {
              permissions: {
                context: concatHexString
              }
            },
            chainId: CHAIN_ID,
            signature: {
              type: 'ecdsa',
              signature: userOpSignature
            }
          }
        ]
      })
    
      return response.data;
    } catch (error) {
      console.error('Error sending user op:', error);
      throw error;
    }
  },

  async getCallsStatus(params: GetCallsStatusParams) {
    const { userOpHash } = params;
    try {
      const client = createWalletClient();
      const response = await client.post('', {
        method: 'wallet_getCallsStatus',
        params: [userOpHash]
      });

      return response.data;
    } catch (error) {
      console.error('Error getting calls status:', error);
      throw error;
    }
  },

  async sendTransaction(params: SendTransactionParams) {
    const { ownerScaAccountAddress, concatHexString, signerAddress, toAddress, value, callData, isSwap } = params;
    try {
      if (isSwap) {
        // const swapRequest = await this.prepareSwap({ownerScaAccountAddress, concatHexString, toAddress, value, callData});
        // console.error('swapRequest', swapRequest)
        const quoteResponse = await quote();
        console.error('quoteResponse', quoteResponse)
        console.error('is a swap')
        return "is a swap"
      }
      const userOpRequest = await this.prepareCalls({ownerScaAccountAddress, concatHexString, toAddress, value, callData});
      console.error('userOpRequest', userOpRequest)
      const rawData = userOpRequest.result.signatureRequest.data.raw;
      const response = await fetch(`http://localhost:3000/api/signer/${signerAddress}/private-key`);
      const data = await response.json();
      const sessionPrivateKey = data.privateKey;
      const sessionKeySigner = LocalAccountSigner.privateKeyToAccountSigner(sessionPrivateKey);
      const userOpSignature = await sessionKeySigner.signMessage({raw: rawData});
      const userOp = await this.sendUserOp({userOpRequest, userOpSignature, concatHexString})
      console.error('userOp', userOp)
      const userOpHash = userOp.result.preparedCallIds[0];
      console.error('userOpHash', userOpHash)
      let callStatus;
      while (true) {
        callStatus = await this.getCallsStatus({userOpHash});
        if (callStatus.result?.status === 200) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      }
      return callStatus.result.receipts;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }
};


