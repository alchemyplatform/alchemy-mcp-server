import dotenv from 'dotenv';
import { pricesClient, nftClient } from './alchemyClients.ts';
import { NFTOwnershipParams, TokenPriceBySymbol, TokenPriceByAddress, TokenPriceByAddressPair, TokenPriceHistoryBySymbol } from '../types/types.ts';
dotenv.config();

const API_KEY = process.env.ALCHEMY_API_KEY;
// const BASE_URL = 'https://eth-mainnet.g.alchemy.com/nft/v3/';

let NFT_DEFAULT_NETWORK = 'eth-mainnet';

const BASE_API_URLS = {
  NFT: `https://${NFT_DEFAULT_NETWORK}.g.alchemy.com/nft/v3/${API_KEY}`,
  PRICES: `https://api.g.alchemy.com/prices/v1/tokens`,
  TOKEN: `https://api.g.alchemy.com/data/v1/${API_KEY}/assets/tokens/by-address`,
  TXN_HISTORY: `https://api.g.alchemy.com/data/v1/${API_KEY}/transactions/history/by-address`
}

export const alchemyApi = {
  // Get NFTs owned by an address
  // TODO: NFT API url is structured differently for each network. Need to add a network param to the function and use the correct url.
  async getNFTsForOwner(params: NFTOwnershipParams) {
    const response = await nftClient.get(BASE_API_URLS.NFT + '/getNFTsForOwner', {
      params: {
        owner: params.owner,
        withMetadata: params.withMetadata,
        contractAddresses: params.contractAddresses ? params.contractAddresses.join(',') : undefined,
        excludeFilters: params.excludeFilters ? params.excludeFilters.join(',') : undefined,
        orderBy: params.orderBy,
        pageSize: params.pageSize,
        pageKey: params.pageKey,
        tokenUriTimeoutInMs: params.tokenUriTimeoutInMs,
        spamConfidenceLevel: params.spamConfidenceLevel
      }
    });
    return response.data;
  },
  async getTokenPriceBySymbol(params: TokenPriceBySymbol) {
    console.log('Fetching token prices for symbols:', params.symbols);
    try {
      const queryParams = new URLSearchParams();
      params.symbols.forEach(symbol => {
        queryParams.append('symbols', symbol.toUpperCase());
      });
      
      const response = await pricesClient.get(`/by-symbol?${queryParams}`);
      
      console.log('Successfully fetched token prices:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      throw error;
    }
  },
  async getTokenPriceByAddress(params: TokenPriceByAddress) {
    console.log('Fetching token price for address:', params.addresses);
    try {
      const response = await pricesClient.post('/by-address', {
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
      const response = await pricesClient.post('/historical', {
        symbol: params.symbol,
        startTime: params.startTime,
        endTime: params.endTime,
        interval: params.interval
      });

      console.log('Successfully fetched token price history:', response.data);
      return response.data;  
    } catch (error) {
      console.error('Error fetching token price history:', error);
      throw error;
    }
  },
};