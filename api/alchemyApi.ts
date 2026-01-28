import dotenv from 'dotenv';
dotenv.config();
import { createPricesClient, createMultiChainTokenClient, createMultiChainTransactionHistoryClient, createAlchemyJsonRpcClient, createNftClient, createAgentsApiClient } from './alchemyClients.js';
import { TokenPriceBySymbol, TokenPriceByAddress, TokenPriceByAddressPair, TokenPriceHistoryBySymbol, MultiChainTokenByAddress, MultiChainTransactionHistoryByAddress, AssetTransfersParams, NftsByAddressParams, NftContractsByAddressParams, AddressPair, SendTransactionParams, SwapParams, CreateAdminAccessKeyParams, PurchaseCreditsParams, GetCreditBalanceParams } from '../types/types.js';
import convertHexBalanceToDecimal from '../utils/convertHexBalanceToDecimal.js';
import { AxiosError } from 'axios';

const AGENT_WALLET_SERVER = process.env.AGENT_WALLET_SERVER;

// Helper function to enhance error messages for 429 errors
function enhance429Error(error: any, accessKey?: string): Error {
  if (error?.response?.status === 429 || error?.status === 429) {
    const message = accessKey
      ? `Rate limit exceeded (429). You can purchase more credits using the 'purchaseCredits' tool with your access key, then retry this request.`
      : `Rate limit exceeded (429). To purchase credits, provide an access key with your requests.`;

    const enhancedError = new Error(message);
    (enhancedError as any).originalError = error;
    (enhancedError as any).statusCode = 429;
    return enhancedError;
  }
  return error;
}

export const alchemyApi = {

  async getTokenPriceBySymbol(params: TokenPriceBySymbol) {
    try {
      const { accessKey, ...queryParams } = params;
      const client = createPricesClient(accessKey);

      const urlParams = new URLSearchParams();
      queryParams.symbols.forEach(symbol => {
        urlParams.append('symbols', symbol.toUpperCase());
      });

      const response = await client.get(`/by-symbol?${urlParams}`);
      return response.data;
    } catch (error) {
      throw enhance429Error(error, params.accessKey);
    }
  },

  async getTokenPriceByAddress(params: TokenPriceByAddress) {
    try {
      const { accessKey, ...queryParams } = params;
      const client = createPricesClient(accessKey);

      const response = await client.post('/by-address', {
        addresses: queryParams.addresses.map((pair: TokenPriceByAddressPair) => ({
          address: pair.address,
          network: pair.network
        }))
      });

      console.log('Successfully fetched token price:', response.data);
      return response.data;
    } catch (error) {
      throw enhance429Error(error, params.accessKey);
    }
  },

  async getTokenPriceHistoryBySymbol(params: TokenPriceHistoryBySymbol) {
    console.log('Fetching token price history for symbol:', params.symbol);
    try {
      const { accessKey, ...queryParams } = params;
      const client = createPricesClient(accessKey);

      const response = await client.post('/historical', {
        ...queryParams
      });

      console.log('Successfully fetched token price history:', response.data);
      return response.data;
    } catch (error) {
      throw enhance429Error(error, params.accessKey);
    }
  },

  async getTokensByMultichainAddress(params: MultiChainTokenByAddress) {
    try {
      const { accessKey, ...queryParams } = params;
      const client = createMultiChainTokenClient(accessKey);

      const response = await client.post('/by-address', {
        addresses: queryParams.addresses.map((pair: AddressPair) => ({
          address: pair.address,
          networks: pair.networks
        }))
      });

      const responseData = convertHexBalanceToDecimal(response);
      return responseData;
    } catch (error) {
      throw enhance429Error(error, params.accessKey);
    }
  },

  async getTransactionHistoryByMultichainAddress(params: MultiChainTransactionHistoryByAddress) {
    try {
      const { accessKey, addresses, ...otherParams } = params;
      const client = createMultiChainTransactionHistoryClient(accessKey);

      const response = await client.post('/by-address', {
        addresses: addresses.map((pair: AddressPair) => ({
          address: pair.address,
          networks: pair.networks
        })),
        ...otherParams
      });

      return response.data;
    } catch (error) {
      throw enhance429Error(error, params.accessKey);
    }
  },

  async getAssetTransfers(params: AssetTransfersParams) {
    try {
      const { accessKey, network, ...otherParams } = params;
      const client = createAlchemyJsonRpcClient(network, accessKey);

      const response = await client.post('', {
        method: "alchemy_getAssetTransfers",
        params: [{
          ...otherParams
        }]
      });

      return response.data;
    } catch (error) {
      throw enhance429Error(error, params.accessKey);
    }
  },

  async getNftsForAddress(params: NftsByAddressParams) {
    try {
      const { accessKey, ...queryParams } = params;
      const client = createNftClient(accessKey);

      const response = await client.post('/by-address', {
        ...queryParams
      });

      return response.data;
    } catch (error) {
      throw enhance429Error(error, params.accessKey);
    }
  },

  async getNftContractsByAddress(params: NftContractsByAddressParams) {
    try {
      const { accessKey, ...queryParams } = params;
      const client = createNftClient(accessKey);

      const response = await client.post('/by-address', {
        ...queryParams
      });

      return response.data;
    } catch (error) {
      throw enhance429Error(error, params.accessKey);
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

  async createAdminAccessKey(params: CreateAdminAccessKeyParams) {
    try {
      const client = createAgentsApiClient(params.paymentSignature);

      const response = await client.post('/accounts/admin-access-key', {});

      return response.data;
    } catch (error) {
      console.error('Error creating admin access key:', error);
      throw error;
    }
  },

  async purchaseCredits(params: PurchaseCreditsParams) {
    try {
      const client = createAgentsApiClient();

      const response = await client.post('/credits/purchase', {
        accessKey: params.accessKey
      });

      return response.data;
    } catch (error) {
      console.error('Error purchasing credits:', error);
      throw error;
    }
  },

  async getCreditBalance(params: GetCreditBalanceParams) {
    try {
      const client = createAgentsApiClient();

      const response = await client.post('/credits/balance', {
        accessKey: params.accessKey
      });

      return response.data;
    } catch (error) {
      console.error('Error getting credit balance:', error);
      throw error;
    }
  }
};


