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

export interface MultiChainTransactionHistoryByAddress extends MultiChainTokenByAddress {
  before?: string;
  after?: string;
  limit?: number;
}

export interface AssetTransfersParams {
  fromBlock: string;
  toBlock: string;
  fromAddress?: string;
  toAddress?: string;
  contractAddresses: string[];
  category: string[];
  order: string;
  withMetadata: boolean;
  excludeZeroValue: boolean;
  maxCount: string;
  pageKey?: string;
  network: string;
}