import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = 'yeG95r7lTdAgDMZFTEljLzsV_NjaXsr2';
const BASE_URL = 'https://eth-mainnet.g.alchemy.com/nft/v3/';

// Create Axios client with the proper base URL format for Alchemy API
const alchemyClient = axios.create({
  baseURL: BASE_URL + API_KEY,
  headers: {
    'Accept': 'application/json',
  },
});

export interface NFTOwnershipParams {
  owner: string;
  withMetadata?: boolean;
  contractAddresses?: string[];
  excludeFilters?: string[];
  pageSize?: number;
  pageKey?: string;
  orderBy?: string;
  tokenUriTimeoutInMs?: number;
  spamConfidenceLevel?: string;
}

// export interface GetOwnersForNFTParams {
//   contractAddress: string;
//   tokenId: string;
//   pageKey?: string;
//   pageSize?: number;
// }

// export interface GetOwnersForCollectionParams {
//   contractAddress: string;
//   withTokenBalances?: boolean;
//   pageKey?: string;
//   pageSize?: number;
// }

// export interface IsHolderOfCollectionParams {
//   wallet: string;
//   contractAddress: string;
// }

/**
 * NFT API Ownership Endpoints
 */
export const alchemyApi = {
  // Get NFTs owned by an address
  async getNFTsForOwner(params: NFTOwnershipParams) {
    const response = await alchemyClient.get('/getNFTsForOwner', {
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

  // Get owners for a specific NFT
  // async getOwnersForNFT(params: GetOwnersForNFTParams) {
  //   const response = await alchemyClient.get('/getOwnersForToken', {
  //     params: {
  //       contractAddress: params.contractAddress,
  //       tokenId: params.tokenId,
  //       pageKey: params.pageKey,
  //       pageSize: params.pageSize
  //     }
  //   });
  //   return response.data;
  // },

  // // Get owners for a collection
  // async getOwnersForCollection(params: GetOwnersForCollectionParams) {
  //   const response = await alchemyClient.get('/getOwnersForCollection', {
  //     params: {
  //       contractAddress: params.contractAddress,
  //       withTokenBalances: params.withTokenBalances,
  //       pageKey: params.pageKey,
  //       pageSize: params.pageSize
  //     }
  //   });
  //   return response.data;
  // },

  // // Check if an address owns an NFT from a collection
  // async isHolderOfCollection(params: IsHolderOfCollectionParams) {
  //   const response = await alchemyClient.get('/isHolderOfCollection', {
  //     params: {
  //       wallet: params.wallet,
  //       contractAddress: params.contractAddress
  //     }
  //   });
  //   return response.data;
  // }
}; 