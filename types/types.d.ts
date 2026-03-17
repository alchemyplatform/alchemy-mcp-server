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

// || ** NFT v3 API ** ||

export interface GetNFTsForOwnerV3Params {
  owner: string;
  contractAddresses?: string[];
  withMetadata?: boolean;
  pageKey?: string;
  pageSize?: number;
  excludeFilters?: string[];
  orderBy?: string;
  network?: string;
}

export interface GetNFTsForContractParams {
  contractAddress: string;
  withMetadata?: boolean;
  startToken?: string;
  limit?: number;
  network?: string;
}

export interface GetNFTsForCollectionParams {
  collectionSlug: string;
  withMetadata?: boolean;
  startToken?: string;
  limit?: number;
  network?: string;
}

export interface GetNFTMetadataParams {
  contractAddress: string;
  tokenId: string;
  tokenType?: string;
  network?: string;
}

export interface GetContractMetadataParams {
  contractAddress: string;
  network?: string;
}

export interface GetCollectionMetadataParams {
  collectionSlug: string;
  network?: string;
}

export interface GetOwnersForNFTParams {
  contractAddress: string;
  tokenId: string;
  pageKey?: string;
  pageSize?: number;
  network?: string;
}

export interface GetOwnersForContractParams {
  contractAddress: string;
  withTokenBalances?: boolean;
  pageKey?: string;
  block?: string;
  network?: string;
}

export interface GetContractsForOwnerParams {
  owner: string;
  pageKey?: string;
  pageSize?: number;
  excludeFilters?: string[];
  includeFilters?: string[];
  network?: string;
}

export interface GetCollectionsForOwnerParams {
  owner: string;
  pageKey?: string;
  pageSize?: number;
  excludeFilters?: string[];
  includeFilters?: string[];
  network?: string;
}

export interface IsSpamContractParams {
  contractAddress: string;
  network?: string;
}

export interface IsAirdropNFTParams {
  contractAddress: string;
  tokenId: string;
  network?: string;
}

export interface IsHolderOfContractParams {
  wallet: string;
  contractAddress: string;
  network?: string;
}

export interface GetFloorPriceParams {
  contractAddress: string;
  network?: string;
}

export interface GetNFTSalesParams {
  contractAddress?: string;
  tokenId?: string;
  marketplace?: string;
  order?: string;
  limit?: number;
  pageKey?: string;
  network?: string;
}

export interface ComputeRarityParams {
  contractAddress: string;
  tokenId: string;
  network?: string;
}

export interface SummarizeNFTAttributesParams {
  contractAddress: string;
  network?: string;
}

export interface SearchContractMetadataParams {
  query: string;
  network?: string;
}

// || ** Token RPC API ** ||

export interface GetTokenAllowanceParams {
  contract: string;
  owner: string;
  spender: string;
  network?: string;
}

export interface GetTokenBalancesParams {
  address: string;
  tokenAddresses?: string[];
  network?: string;
}

export interface GetTokenMetadataParams {
  contractAddress: string;
  network?: string;
}

// || ** Transaction Receipts API ** ||

export interface GetTransactionReceiptsParams {
  blockNumber?: string;
  blockHash?: string;
  network?: string;
}

// || ** Transaction Simulation API ** ||

export interface SimulateAssetChangesParams {
  from: string;
  to: string;
  value?: string;
  data?: string;
  network?: string;
}

export interface SimulateExecutionParams {
  from: string;
  to: string;
  data?: string;
  value?: string;
  blockTag?: string;
  network?: string;
}

// || ** Trace API ** ||

export interface TraceTransactionParams {
  transactionHash: string;
  network?: string;
}

export interface TraceBlockParams {
  blockIdentifier: string;
  network?: string;
}

export interface TraceCallParams {
  from?: string;
  to: string;
  gas?: string;
  gasPrice?: string;
  value?: string;
  data?: string;
  traceTypes: string[];
  blockIdentifier?: string;
  network?: string;
}

export interface TraceFilterParams {
  fromBlock?: string;
  toBlock?: string;
  fromAddress?: string[];
  toAddress?: string[];
  after?: number;
  count?: number;
  network?: string;
}

export interface TraceGetParams {
  transactionHash: string;
  traceIndexes: string[];
  network?: string;
}

// || ** Debug API ** ||

export interface DebugTraceTransactionParams {
  transactionHash: string;
  tracer?: string;
  tracerConfig?: Record<string, any>;
  timeout?: string;
  network?: string;
}

export interface DebugTraceCallParams {
  from?: string;
  to: string;
  gas?: string;
  gasPrice?: string;
  value?: string;
  data?: string;
  blockIdentifier?: string;
  tracer?: string;
  tracerConfig?: Record<string, any>;
  network?: string;
}

export interface DebugTraceBlockByNumberParams {
  blockNumber: string;
  tracer?: string;
  tracerConfig?: Record<string, any>;
  network?: string;
}

// || ** Solana DAS API ** ||

export interface SolanaGetAssetParams {
  id: string;
  network?: string;
}

export interface SolanaGetAssetsParams {
  ids: string[];
  network?: string;
}

export interface SolanaGetAssetProofParams {
  id: string;
  network?: string;
}

export interface SolanaGetAssetsByOwnerParams {
  ownerAddress: string;
  sortBy?: string;
  sortDirection?: string;
  limit?: number;
  page?: number;
  before?: string;
  after?: string;
  network?: string;
}

export interface SolanaGetAssetsByAuthorityParams {
  authorityAddress: string;
  sortBy?: string;
  sortDirection?: string;
  limit?: number;
  page?: number;
  before?: string;
  after?: string;
  network?: string;
}

export interface SolanaGetAssetsByCreatorParams {
  creatorAddress: string;
  onlyVerified?: boolean;
  sortBy?: string;
  sortDirection?: string;
  limit?: number;
  page?: number;
  before?: string;
  after?: string;
  network?: string;
}

export interface SolanaGetAssetsByGroupParams {
  groupKey: string;
  groupValue: string;
  sortBy?: string;
  sortDirection?: string;
  limit?: number;
  page?: number;
  before?: string;
  after?: string;
  network?: string;
}

export interface SolanaSearchAssetsParams {
  ownerAddress?: string;
  creatorAddress?: string;
  grouping?: string[];
  burnt?: boolean;
  limit?: number;
  page?: number;
  before?: string;
  after?: string;
  network?: string;
}

export interface SolanaGetAssetSignaturesParams {
  id: string;
  limit?: number;
  page?: number;
  before?: string;
  after?: string;
  network?: string;
}

export interface SolanaGetNftEditionsParams {
  mintAddress: string;
  limit?: number;
  page?: number;
  before?: string;
  after?: string;
  network?: string;
}

export interface SolanaGetTokenAccountsParams {
  mintAddress?: string;
  ownerAddress?: string;
  limit?: number;
  cursor?: string;
  network?: string;
}

// || ** Eth Beacon API ** ||

export interface BeaconBlockParams {
  blockId: string;
}

export interface BeaconBlobSidecarsParams {
  blockId: string;
  indices?: number[];
}

export interface BeaconHeadersParams {
  slot?: string;
  parentRoot?: string;
}

export interface BeaconStateParams {
  stateId: string;
}

export interface BeaconCommitteesParams {
  stateId: string;
  epoch?: string;
  index?: string;
  slot?: string;
}

export interface BeaconSyncCommitteesParams {
  stateId: string;
  epoch?: string;
}

export interface BeaconRandaoParams {
  stateId: string;
  epoch: string;
}

export interface BeaconValidatorBalancesParams {
  stateId: string;
  id?: string[];
}

export interface BeaconValidatorsParams {
  stateId: string;
  id?: string[];
  status?: string[];
}

export interface BeaconValidatorParams {
  stateId: string;
  validatorId: string;
}

// || ** Aptos API ** ||

export interface AptosAccountParams {
  address: string;
  ledgerVersion?: string;
}

export interface AptosAccountResourceParams {
  address: string;
  resourceType: string;
  ledgerVersion?: string;
}

export interface AptosAccountModuleParams {
  address: string;
  moduleName: string;
  ledgerVersion?: string;
}

export interface AptosAccountTransactionsParams {
  address: string;
  limit?: number;
  start?: string;
}

export interface AptosEventsByCreationNumberParams {
  address: string;
  creationNumber: string;
  start?: string;
  limit?: number;
}

export interface AptosEventsByEventHandleParams {
  address: string;
  eventHandle: string;
  fieldName: string;
  start?: string;
  limit?: number;
}

export interface AptosBlockByHeightParams {
  blockHeight: number;
  withTransactions?: boolean;
}

export interface AptosBlockByVersionParams {
  version: number;
  withTransactions?: boolean;
}

export interface AptosTransactionsParams {
  start?: string;
  limit?: number;
}

export interface AptosTransactionByHashParams {
  txnHash: string;
}

export interface AptosHealthParams {
  durationSecs?: number;
}

// || ** Notify (Webhooks) API ** ||

export interface GetWebhookAddressesParams {
  webhookId: string;
  limit?: number;
  after?: string;
}

export interface GetWebhookNftFiltersParams {
  webhookId: string;
  limit?: number;
  after?: string;
}

export interface GetWebhookVariableParams {
  variable: string;
  limit?: number;
  after?: string;
}

// || ** Admin (Gas Manager) API ** ||

export interface GetGasManagerPolicyParams {
  id: string;
}

export interface GetGasManagerPoliciesParams {
  appId?: string;
  limit?: number;
  before?: string;
  after?: string;
}

export interface GetGasManagerPolicySponsorshipsParams {
  id: string;
  limit?: number;
}
