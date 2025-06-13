import dotenv from 'dotenv';
import { createPricesClient, createMultiChainTokenClient, createMultiChainTransactionHistoryClient, createAlchemyJsonRpcClient, createNftClient, createWalletClient } from './alchemyClients.js';
import { TokenPriceBySymbol, TokenPriceByAddress, TokenPriceByAddressPair, TokenPriceHistoryBySymbol, MultiChainTokenByAddress, MultiChainTransactionHistoryByAddress, AssetTransfersParams, NftsByAddressParams, NftContractsByAddressParams, AddressPair, PrepareCallsParams, SendTransactionParams, SendUserOpParams, GetCallsStatusParams, SwapParams, Call } from '../types/types.js';
import convertHexBalanceToDecimal from '../utils/convertHexBalanceToDecimal.js';
import { toHex } from 'viem';
import { sepolia } from 'viem/chains';
import { LocalAccountSigner } from '@aa-sdk/core';
import { createTrade } from '../libs/uniswap/trading.js';
import { displayTrade } from '../libs/uniswap/utils.js';
import { CurrentConfig } from '../libs/uniswap/config.js';
import { ethers } from 'ethers';
import { ERC20_ABI, TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER, WETH_CONTRACT_ADDRESS, SWAP_ROUTER_ADDRESS, USDC_CONTRACT_ADDRESS } from '../libs/uniswap/constants.js';
import { Percent } from '@uniswap/sdk-core';

dotenv.config();

const POLICY_ID = process.env.POLICY_ID;
const CHAIN_ID = toHex(sepolia.id);
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

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
    const { ownerScaAccountAddress, concatHexString, calls, gasParamsOverride} = params;
    
    try {
      const client = createWalletClient();

      const capabilities: any = {
        permissions: {
          context: concatHexString
        },
        paymasterService: {
          policyId: POLICY_ID
        }
      };

      if (gasParamsOverride) {
        capabilities.gasParamsOverride = gasParamsOverride;
      }

      const response = await client.post('', {
        method: "wallet_prepareCalls",
        params: [{
          capabilities,
          calls,
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
              data: userOpSignature
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
    const { ownerScaAccountAddress, concatHexString, signerAddress, toAddress, value } = params;
    try {
      const userOpRequest = await this.prepareCalls({ownerScaAccountAddress, concatHexString, calls: [{to: toAddress, value: value, data: '0x0'}]});
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
  },
  
  async swap(params: SwapParams) {
    const { ownerScaAccountAddress, concatHexString, signerAddress } = params;
    console.error('is a new swap')
    try { 
      // Create the trade
      const trade = await createTrade();
      const tradeDisplay = displayTrade(trade);

      // Check WETH balance
      const provider = new ethers.providers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`);
      const wethContract = new ethers.Contract(WETH_CONTRACT_ADDRESS, ERC20_ABI, provider);
      const wethBalance = await wethContract.balanceOf(ownerScaAccountAddress);
      console.error('WETH Balance:', {
        balance: wethBalance.toString(),
        required: trade.inputAmount.quotient.toString()
      });

      if (wethBalance < trade.inputAmount.quotient) {
        throw new Error(`Insufficient WETH balance. Have ${wethBalance.toString()}, need ${trade.inputAmount.quotient.toString()}`);
      }

      // Check current allowance
      const currentAllowance = await wethContract.allowance(ownerScaAccountAddress, SWAP_ROUTER_ADDRESS);
      console.error('Current allowance:', currentAllowance.toString());
      console.error('TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER:', TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER);

      // Approve the token transfer with exact amount needed
      const approvalInterface = new ethers.utils.Interface(ERC20_ABI);
      const approvalEncodedData = approvalInterface.encodeFunctionData('approve', [
        SWAP_ROUTER_ADDRESS, 
        trade.inputAmount.quotient.toString() // Approve exact amount needed instead of TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER
      ]);
     
      const approvalCall = {
        to: WETH_CONTRACT_ADDRESS,
        value: '0x0',
        data: approvalEncodedData
      }

      // Execute params
      const swapRouterInterface = new ethers.utils.Interface([
        'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
      ]);

      const executeParams = {
        tokenIn: CurrentConfig.tokens.in.address,
        tokenOut: CurrentConfig.tokens.out.address,
        fee: CurrentConfig.tokens.poolFee,
        recipient: ownerScaAccountAddress,
        amountIn: trade.inputAmount.quotient.toString(),
        amountOutMinimum: trade.minimumAmountOut(new Percent(1000, 10_000)).quotient.toString(), // 10% slippage
        sqrtPriceLimitX96: 0,
      }
    
      const executeEncodedData = swapRouterInterface.encodeFunctionData('exactInputSingle', [executeParams]);
      console.error('Swap calldata:', executeEncodedData);
      
      const executeCall = {
        to: SWAP_ROUTER_ADDRESS,
        value: '0x0',
        data: executeEncodedData
      }

      // This is where we can pass all prepared calls in.
      const preparedCalls = [approvalCall, executeCall];
      const userOpRequest = await this.prepareCalls({ownerScaAccountAddress, concatHexString, calls: preparedCalls});
      console.error('userOpRequest', userOpRequest)
      const rawData = userOpRequest.result.signatureRequest.data.raw;
      const response = await fetch(`http://localhost:3000/api/signer/${signerAddress}/private-key`);
      const data = await response.json();
      const sessionPrivateKey = data.privateKey;
      const sessionKeySigner = LocalAccountSigner.privateKeyToAccountSigner(sessionPrivateKey);
      const userOpSignature = await sessionKeySigner.signMessage({raw: rawData});
      const userOp = await this.sendUserOp({userOpRequest, userOpSignature, concatHexString})

      if (!userOp?.result?.preparedCallIds?.[0]) {
        const errorMsg = userOp?.error?.message || 'Unknown error';
        throw new Error(`Failed to approve token transfer: ${errorMsg}`);
      }

      const userOpHash = userOp.result.preparedCallIds[0];
      let callStatus;
      while (true) {
        callStatus = await this.getCallsStatus({userOpHash});
        if (callStatus.result?.status === 200) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      }
      console.error('callStatus approval', callStatus.result.receipts)

      return callStatus.result.receipts;

    } catch (error) {
      console.error('Error preparing swap:', error);
      throw error;
    }
  }
};


