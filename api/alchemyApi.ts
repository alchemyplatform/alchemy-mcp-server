import dotenv from 'dotenv';
import { createPricesClient, createMultiChainTokenClient, createMultiChainTransactionHistoryClient, createAlchemyJsonRpcClient, createNftClient } from './alchemyClients.js';
import { TokenPriceBySymbol, TokenPriceByAddress, TokenPriceByAddressPair, TokenPriceHistoryBySymbol, MultiChainTokenByAddress, MultiChainTransactionHistoryByAddress, AssetTransfersParams, NftsByAddressParams, NftContractsByAddressParams, AddressPair } from '../types/types.js';
import convertHexBalanceToDecimal from '../utils/convertHexBalanceToDecimal.js';
dotenv.config();

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
  }
};