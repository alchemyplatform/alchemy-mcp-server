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
  excludeFilters: Array<"SPAM" | "AIRDROPS">;
  includeFilters: Array<"SPAM" | "AIRDROPS">;
  spamConfidenceLevel: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
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

// || ** NFT V3 API (single-chain GET endpoints) ** ||

export interface NftV3BaseParams {
  network: string;
}

export interface GetNFTsForOwnerParams extends NftV3BaseParams {
  owner: string;
  contractAddresses?: string[];
  withMetadata?: boolean;
  orderBy?: string;
  excludeFilters?: string[];
  includeFilters?: string[];
  spamConfidenceLevel?: string;
  tokenUriTimeoutInMs?: number;
  pageKey?: string;
  pageSize?: number;
}

export interface GetNFTsForContractParams extends NftV3BaseParams {
  contractAddress: string;
  withMetadata?: boolean;
  startToken?: string;
  limit?: number;
  tokenUriTimeoutInMs?: number;
}

export interface GetNFTsForCollectionParams extends NftV3BaseParams {
  contractAddress?: string;
  collectionSlug?: string;
  withMetadata?: boolean;
  startToken?: string;
  limit?: number;
  tokenUriTimeoutInMs?: number;
}

export interface GetNFTMetadataParams extends NftV3BaseParams {
  contractAddress: string;
  tokenId: string;
  tokenType?: string;
  tokenUriTimeoutInMs?: number;
  refreshCache?: boolean;
}

export interface GetContractMetadataParams extends NftV3BaseParams {
  contractAddress: string;
}

export interface GetCollectionMetadataParams extends NftV3BaseParams {
  collectionSlug: string;
}

export interface InvalidateContractParams extends NftV3BaseParams {
  contractAddress: string;
}

export interface GetOwnersForNFTParams extends NftV3BaseParams {
  contractAddress: string;
  tokenId: string;
}

export interface GetOwnersForContractParams extends NftV3BaseParams {
  contractAddress: string;
  withTokenBalances?: boolean;
  pageKey?: string;
}

export type GetSpamContractsParams = NftV3BaseParams;

export interface IsSpamContractParams extends NftV3BaseParams {
  contractAddress: string;
}

export interface IsAirdropNFTParams extends NftV3BaseParams {
  contractAddress: string;
  tokenId: string;
}

export interface SummarizeNFTAttributesParams extends NftV3BaseParams {
  contractAddress: string;
}

export interface GetFloorPriceParams extends NftV3BaseParams {
  contractAddress?: string;
  collectionSlug?: string;
}

export interface SearchContractMetadataParams extends NftV3BaseParams {
  query: string;
}

export interface IsHolderOfContractParams extends NftV3BaseParams {
  wallet: string;
  contractAddress: string;
}

export interface ComputeRarityParams extends NftV3BaseParams {
  contractAddress: string;
  tokenId: string;
}

export interface GetNFTSalesParams extends NftV3BaseParams {
  fromBlock?: string;
  toBlock?: string;
  order?: string;
  marketplace?: string;
  contractAddress?: string;
  tokenId?: string;
  buyerAddress?: string;
  sellerAddress?: string;
  taker?: string;
  limit?: number;
  pageKey?: string;
}

export interface GetContractsForOwnerParams extends NftV3BaseParams {
  owner: string;
  pageKey?: string;
  pageSize?: number;
  withMetadata?: boolean;
  includeFilters?: string[];
  excludeFilters?: string[];
  orderBy?: string;
  spamConfidenceLevel?: string;
}

export interface GetCollectionsForOwnerParams extends NftV3BaseParams {
  owner: string;
  pageKey?: string;
  pageSize?: number;
  withMetadata?: boolean;
  includeFilters?: string[];
  excludeFilters?: string[];
}

export interface ReportSpamParams extends NftV3BaseParams {
  address: string;
  isSpam: boolean;
}

// || ** Token API (JSON-RPC) ** ||

export interface GetTokenAllowanceParams {
  network: string;
  contract: string;
  owner: string;
  spender: string;
}

export interface GetTokenBalancesParams {
  network: string;
  address: string;
  tokenSpec?: string | string[];
  pageKey?: string;
  maxCount?: number;
}

export interface GetTokenMetadataParams {
  network: string;
  contractAddress: string;
}

// || ** Transaction Receipt API (JSON-RPC) ** ||

export interface GetTransactionReceiptsParams {
  network: string;
  blockNumber?: string;
  blockHash?: string;
}

// || ** Debug API (JSON-RPC) ** ||

export interface DebugBlockParams {
  network: string;
  blockNumberOrTag: string;
}

export interface DebugTraceBlockByHashParams {
  network: string;
  blockHash: string;
  tracer?: object;
}

export interface DebugTraceBlockByNumberParams {
  network: string;
  blockNumberOrTag: string;
  tracer?: object;
}

export interface DebugTraceCallParams {
  network: string;
  transaction: Record<string, unknown>;
  blockIdentifier: string;
  options?: Record<string, unknown>;
}

export interface DebugTraceTransactionParams {
  network: string;
  transactionHash: string;
  options?: Record<string, unknown>;
}

// || ** Trace API (JSON-RPC) ** ||

export interface TraceBlockParams {
  network: string;
  blockIdentifier: string;
}

export interface TraceCallParams {
  network: string;
  transaction: Record<string, unknown>;
  traceTypes: string[];
  blockIdentifier?: string;
}

export interface TraceGetParams {
  network: string;
  transactionHash: string;
  traceIndexes: string[];
}

export interface TraceRawTransactionParams {
  network: string;
  rawTransaction: string;
  traceTypes: string[];
}

export interface TraceReplayBlockTransactionsParams {
  network: string;
  blockIdentifier: string;
  traceTypes: string[];
}

export interface TraceReplayTransactionParams {
  network: string;
  transactionHash: string;
  traceTypes: string[];
}

export interface TraceTransactionParams {
  network: string;
  transactionHash: string;
}

export interface TraceFilterParams {
  network: string;
  fromBlock?: string;
  toBlock?: string;
  fromAddress?: string[];
  toAddress?: string[];
  after?: string;
  count?: number;
}

// || ** Transaction Simulation API (JSON-RPC) ** ||

export interface SimulateAssetChangesParams {
  network: string;
  transaction: Record<string, unknown>;
}

export interface SimulateAssetChangesBundleParams {
  network: string;
  transactions: Record<string, unknown>[];
}

export interface SimulateExecutionParams {
  network: string;
  transaction: Record<string, unknown>;
}

export interface SimulateExecutionBundleParams {
  network: string;
  transactions: Record<string, unknown>[];
}

// || ** Bundler API (JSON-RPC) ** ||

export interface BundlerNetworkParams {
  network: string;
}

export interface GetUserOperationReceiptParams {
  network: string;
  userOpHash: string;
}

export interface GetUserOperationByHashParams {
  network: string;
  userOpHash: string;
}

export interface EstimateUserOperationGasParams {
  network: string;
  userOperation: Record<string, unknown>;
  entryPoint: string;
  stateOverrideSet?: Record<string, unknown>;
}

// || ** UserOp Simulation API (JSON-RPC) ** ||

export interface SimulateUserOperationAssetChangesParams {
  network: string;
  userOperation: Record<string, unknown>;
  entryPoint: string;
  blockNumber?: string;
}

// || ** Beacon API (REST GET) ** ||

export interface BeaconNetworkParams {
  network: string;
}

export interface BeaconBlockIdParams extends BeaconNetworkParams {
  blockId: string;
}

export interface BeaconStateIdParams extends BeaconNetworkParams {
  stateId: string;
}

export interface BeaconBlobSidecarsParams extends BeaconBlockIdParams {
  indices?: string[];
}

export interface BeaconHeadersParams extends BeaconNetworkParams {
  slot?: string;
  parentRoot?: string;
}

export interface BeaconCommitteesParams extends BeaconStateIdParams {
  epoch?: string;
  index?: string;
  slot?: string;
}

export interface BeaconSyncCommitteesParams extends BeaconStateIdParams {
  epoch?: string;
}

export interface BeaconRandaoParams extends BeaconStateIdParams {
  epoch: string;
}

export interface BeaconValidatorBalancesParams extends BeaconStateIdParams {
  id?: string[];
}

export interface BeaconValidatorsParams extends BeaconStateIdParams {
  id?: string[];
  status?: string[];
}

export interface BeaconValidatorByIdParams extends BeaconStateIdParams {
  validatorId: string;
}

export interface BeaconPeersParams extends BeaconNetworkParams {
  state?: string[];
  direction?: string[];
}

// || ** Solana DAS API (JSON-RPC) ** ||

export interface SolanaGetAssetParams {
  network: string;
  id: string;
}

export interface SolanaGetAssetsParams {
  network: string;
  ids: string[];
}

export interface SolanaGetAssetProofParams {
  network: string;
  id: string;
}

export interface SolanaGetAssetProofsParams {
  network: string;
  ids: string[];
}

export interface SolanaGetAssetsByFilterParams {
  network: string;
  sortBy?: Record<string, unknown>;
  limit?: number;
  page?: number;
  before?: string;
  after?: string;
}

export interface SolanaGetAssetsByAuthorityParams extends SolanaGetAssetsByFilterParams {
  authorityAddress: string;
}

export interface SolanaGetAssetsByCreatorParams extends SolanaGetAssetsByFilterParams {
  creatorAddress: string;
  onlyVerified?: boolean;
}

export interface SolanaGetAssetsByGroupParams extends SolanaGetAssetsByFilterParams {
  groupKey: string;
  groupValue: string;
}

export interface SolanaGetAssetsByOwnerParams extends SolanaGetAssetsByFilterParams {
  ownerAddress: string;
}

export interface SolanaGetAssetSignaturesParams {
  network: string;
  id: string;
  limit?: number;
  page?: number;
  before?: string;
  after?: string;
}

export interface SolanaGetNftEditionsParams {
  network: string;
  mintAddress: string;
  limit?: number;
  page?: number;
}

export interface SolanaGetTokenAccountsParams {
  network: string;
  mintAddress?: string;
  ownerAddress?: string;
  limit?: number;
  cursor?: string;
}

export interface SolanaSearchAssetsParams extends SolanaGetAssetsByFilterParams {
  ownerAddress?: string;
  creatorAddress?: string;
  authorityAddress?: string;
  grouping?: string[];
  burnt?: boolean;
  frozen?: boolean;
  negate?: boolean;
  conditionType?: string;
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
