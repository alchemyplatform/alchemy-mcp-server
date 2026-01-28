// || ** Prices API ** ||
export interface TokenPriceBySymbol {
  symbols: string[];
  accessKey?: string;
}

export interface TokenPriceByAddress {
  addresses: TokenPriceByAddressPair[];
  accessKey?: string;
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
  accessKey?: string;
}

// || ** MultiChain Token API ** ||
export interface MultiChainTokenByAddress {
  addresses: AddressPair[];
  accessKey?: string;
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
  accessKey?: string;
}

// || ** NFT API ** ||
export interface NftsByAddressParams {
  addresses: NftsByAddressPair[];
  withMetadata: boolean;
  pageKey?: string;
  pageSize: number;
  accessKey?: string;
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
  accessKey?: string;
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
  bypassPayment?: boolean;
  paymentSignature?: string;
}

export interface PurchaseCreditsParams {
  accessKey: string;
}

export interface GetCreditBalanceParams {
  accessKey: string;
}
