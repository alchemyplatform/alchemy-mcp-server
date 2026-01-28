import dotenv from 'dotenv';
dotenv.config();
import { createPricesClient, createMultiChainTokenClient, createMultiChainTransactionHistoryClient, createAlchemyJsonRpcClient, createNftClient, createAgentsApiClient } from './alchemyClients.js';
import { TokenPriceBySymbol, TokenPriceByAddress, TokenPriceByAddressPair, TokenPriceHistoryBySymbol, MultiChainTokenByAddress, MultiChainTransactionHistoryByAddress, AssetTransfersParams, NftsByAddressParams, NftContractsByAddressParams, AddressPair, SendTransactionParams, SwapParams, CreateAdminAccessKeyParams, PurchaseCreditsParams, GetCreditBalanceParams } from '../types/types.js';
import convertHexBalanceToDecimal from '../utils/convertHexBalanceToDecimal.js';
import { AxiosError } from 'axios';

const AGENT_WALLET_SERVER = process.env.AGENT_WALLET_SERVER;

// Helper function to check if error is a 429 rate limit error
function is429Error(error: any): boolean {
  return error?.response?.status === 429 || error?.status === 429;
}

// Helper function to retry API call after purchasing credits
async function withRetryOn429<T>(
  apiCall: () => Promise<T>,
  accessKey?: string,
  retryCount = 0
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    // Only retry once and only if we have an accessKey
    if (is429Error(error) && accessKey && retryCount === 0) {
      console.log('Received 429 rate limit error. Attempting to purchase credits...');

      try {
        // Purchase credits
        await alchemyApi.purchaseCredits({ accessKey });
        console.log('Successfully purchased credits. Retrying request...');

        // Retry the original request
        return await apiCall();
      } catch (purchaseError) {
        console.error('Failed to purchase credits:', purchaseError);
        // Throw the original error if credit purchase fails
        throw error;
      }
    }

    // If no accessKey, already retried, or not a 429, throw the original error
    throw error;
  }
}

export const alchemyApi = {

  async getTokenPriceBySymbol(params: TokenPriceBySymbol) {
    const { accessKey, ...queryParams } = params;

    return withRetryOn429(
      async () => {
        const client = createPricesClient(accessKey);

        const urlParams = new URLSearchParams();
        queryParams.symbols.forEach(symbol => {
          urlParams.append('symbols', symbol.toUpperCase());
        });

        const response = await client.get(`/by-symbol?${urlParams}`);
        return response.data;
      },
      accessKey
    );
  },

  async getTokenPriceByAddress(params: TokenPriceByAddress) {
    const { accessKey, ...queryParams } = params;

    return withRetryOn429(
      async () => {
        const client = createPricesClient(accessKey);

        const response = await client.post('/by-address', {
          addresses: queryParams.addresses.map((pair: TokenPriceByAddressPair) => ({
            address: pair.address,
            network: pair.network
          }))
        });

        console.log('Successfully fetched token price:', response.data);
        return response.data;
      },
      accessKey
    );
  },

  async getTokenPriceHistoryBySymbol(params: TokenPriceHistoryBySymbol) {
    console.log('Fetching token price history for symbol:', params.symbol);
    const { accessKey, ...queryParams } = params;

    return withRetryOn429(
      async () => {
        const client = createPricesClient(accessKey);

        const response = await client.post('/historical', {
          ...queryParams
        });

        console.log('Successfully fetched token price history:', response.data);
        return response.data;
      },
      accessKey
    );
  },

  async getTokensByMultichainAddress(params: MultiChainTokenByAddress) {
    const { accessKey, ...queryParams } = params;

    return withRetryOn429(
      async () => {
        const client = createMultiChainTokenClient(accessKey);

        const response = await client.post('/by-address', {
          addresses: queryParams.addresses.map((pair: AddressPair) => ({
            address: pair.address,
            networks: pair.networks
          }))
        });

        const responseData = convertHexBalanceToDecimal(response);
        return responseData;
      },
      accessKey
    );
  },

  async getTransactionHistoryByMultichainAddress(params: MultiChainTransactionHistoryByAddress) {
    const { accessKey, addresses, ...otherParams } = params;

    return withRetryOn429(
      async () => {
        const client = createMultiChainTransactionHistoryClient(accessKey);

        const response = await client.post('/by-address', {
          addresses: addresses.map((pair: AddressPair) => ({
            address: pair.address,
            networks: pair.networks
          })),
          ...otherParams
        });

        return response.data;
      },
      accessKey
    );
  },

  async getAssetTransfers(params: AssetTransfersParams) {
    const { accessKey, network, ...otherParams } = params;

    return withRetryOn429(
      async () => {
        const client = createAlchemyJsonRpcClient(network, accessKey);

        const response = await client.post('', {
          method: "alchemy_getAssetTransfers",
          params: [{
            ...otherParams
          }]
        });

        return response.data;
      },
      accessKey
    );
  },

  async getNftsForAddress(params: NftsByAddressParams) {
    const { accessKey, ...queryParams } = params;

    return withRetryOn429(
      async () => {
        const client = createNftClient(accessKey);

        const response = await client.post('/by-address', {
          ...queryParams
        });

        return response.data;
      },
      accessKey
    );
  },

  async getNftContractsByAddress(params: NftContractsByAddressParams) {
    const { accessKey, ...queryParams } = params;

    return withRetryOn429(
      async () => {
        const client = createNftClient(accessKey);

        const response = await client.post('/by-address', {
          ...queryParams
        });

        return response.data;
      },
      accessKey
    );
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

      const response = await client.post('/accounts/admin-access-key', {
        bypassPayment: params.bypassPayment ?? false
      });

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


