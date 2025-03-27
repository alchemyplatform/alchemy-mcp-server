/**
 * Type definitions for Alchemy API responses
 */

// NFT Types
export interface NFT {
  id: {
    tokenId: string;
    tokenMetadata: {
      tokenType: string;
    };
  };
  balance: string;
  title: string;
  description: string;
  tokenUri: {
    raw: string;
    gateway: string;
  };
  media: Array<{
    raw: string;
    gateway: string;
    thumbnail?: string;
    format?: string;
    bytes?: number;
  }>;
  metadata: {
    [key: string]: any;
  };
  timeLastUpdated: string;
  contractAddress: string;
  spamInfo?: {
    isSpam: boolean;
    classifications: string[];
  };
}

// NFTs for Owner Response
export interface NFTsForOwnerResponse {
  ownedNfts: NFT[];
  pageKey?: string;
  totalCount: number;
  blockHash: string;
}

// Owners for NFT Response
export interface OwnersForNFTResponse {
  owners: string[];
  pageKey?: string;
}

// Owners for Collection Response
export interface OwnerWithTokenBalances {
  ownerAddress: string;
  tokenBalances: Array<{
    tokenId: string;
    balance: number;
  }>;
}

export interface OwnersForCollectionResponse {
  owners: string[] | OwnerWithTokenBalances[];
  pageKey?: string;
}

// Is Holder of Collection Response
export interface IsHolderOfCollectionResponse {
  isHolderOfCollection: boolean;
} 