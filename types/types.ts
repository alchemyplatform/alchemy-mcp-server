// || ** Prices API ** ||
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

// || ** MultiChain Token API ** ||
export interface MultiChainTokenByAddress {
  addresses: AddressPair[];
}

// || ** MultiChain Transaction History API ** ||
export interface MultiChainTransactionHistoryByAddress extends MultiChainTokenByAddress {
  before?: string;
  after?: string;
  limit?: number;
}

// || ** Transfers API ** ||
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

// || ** NFT API ** ||
export interface NftsByAddressParams {
  addresses: NftsByAddressPair[];
  withMetadata: boolean;
  pageKey?: string;
  pageSize: number;
}

export interface NftsByAddressPair {
  address: string;
  networks: string[];
  excludeFilters: Array<'SPAM' | 'AIRDROPS'>;
  includeFilters: Array<'SPAM' | 'AIRDROPS'>;
  spamConfidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
}

export interface NftContractsByAddressParams {
  addresses: AddressPair[];
  withMetadata: boolean;
}

// || ** Utils ** ||

export interface AddressPair {
  address: string;
  networks: string[];
}