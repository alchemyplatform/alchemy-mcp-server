// NFT API
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

// Prices API
export interface TokenPriceBySymbol {
  symbols: string[];
}

export interface TokenPriceByAddress {
  addresses: TokenPriceByAddressPair[];
}

export interface TokenPriceByAddressPair {
  address: string;
  network: string;
}

export interface TokenPriceHistoryBySymbol {
  symbol: string;
  startTime: string;
  endTime: string;
  interval: string;
}

export interface MultiChainTokenByAddress {
  addresses: MultiChainTokenByAddressPair[];
}

export interface MultiChainTokenByAddressPair {
  address: string;
  networks: string[];
}
