// || ** Prices API ** ||
export interface TokenPriceBySymbol {
  symbols: string[];
  apiKey?: string;
  accessKey?: string; // Deprecated: use apiKey instead
}

export interface TokenPriceByAddress {
  addresses: TokenPriceByAddressPair[];
  apiKey?: string;
  accessKey?: string; // Deprecated: use apiKey instead
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
  apiKey?: string;
  accessKey?: string; // Deprecated: use apiKey instead
}

// || ** MultiChain Token API ** ||
export interface MultiChainTokenByAddress {
  addresses: AddressPair[];
  apiKey?: string;
  accessKey?: string; // Deprecated: use apiKey instead
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
  apiKey?: string;
  accessKey?: string; // Deprecated: use apiKey instead
}

// || ** NFT API ** ||
export interface NftsByAddressParams {
  addresses: NftsByAddressPair[];
  withMetadata: boolean;
  pageKey?: string;
  pageSize: number;
  apiKey?: string;
  accessKey?: string; // Deprecated: use apiKey instead
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
  apiKey?: string;
  accessKey?: string; // Deprecated: use apiKey instead
}

// || ** Wallet API ** ||

export interface SendTransactionParams {
  ownerScaAccountAddress: string;
  signerAddress: string;
  toAddress: string;
  value?: string;
  callData?: string;
}

export interface SwapParams {
  ownerScaAccountAddress: string;
  signerAddress: string;
}

// || ** Utils ** ||

export interface AddressPair {
  address: string;
  networks: string[];
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

// || ** Agents API ** ||

export interface CreateAdminAccessKeyParams {
  paymentSignature?: string;
}

export interface PurchaseCreditsParams {
  accessKey: string;
  amount: number;
}

export interface GetCreditBalanceParams {
  accessKey: string;
}
