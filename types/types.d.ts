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

// || ** Wallet API ** ||
export interface PrepareCallsParams {
  ownerScaAccountAddress: string;
  concatHexString: string;
  toAddress: string;
  value?: string;
  callData?: string;
}

export interface SendTransactionParams {
  ownerScaAccountAddress: string;
  concatHexString: string;
  signerAddress: string;
  toAddress: string;
  value?: string;
  callData?: string;
}

export interface SendUserOpParams {
  userOpRequest: any;
  userOpSignature: string;
  concatHexString: string;
}

export interface GetCallsStatusParams {
  userOpHash: string;
}

export interface LocalAccountSigner {
  inner: PrivateKeyAccount;
  signerType: string;
  signMessage: (message: { raw: string }) => Promise<string>;
  signTypedData: (message: { raw: string }) => Promise<string>;
  getAddress: () => Promise<string>;
}

// From viem: https://github.com/wevm/viem/blob/1fab6bb67fef1d274fa947ea9b088cf1285ccd1e/src/accounts/types.ts#L26-L63
export interface PrivateKeyAccount {
  address: string;
  nonceManager: string;
  sign: (message: { raw: string }) => Promise<string>;
  signAuthorization: (message: { raw: string }) => Promise<string>;
  signMessage: (message: { raw: string }) => Promise<string>;
  signTransaction: (message: { raw: string }) => Promise<string>;
  signTypedData: (message: { raw: string }) => Promise<string>;
  source: string;
  type: string;
  publicKey: string;
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
