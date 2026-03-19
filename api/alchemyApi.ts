import type { AxiosInstance } from "axios";
import { inject, injectable } from "inversify";

import { DI_SYMBOLS } from "../di/di-symbols.js";
import type {
  AddressPair,
  AssetTransfersParams,
  BeaconBlobSidecarsParams,
  BeaconBlockIdParams,
  BeaconCommitteesParams,
  BeaconHeadersParams,
  BeaconNetworkParams,
  BeaconRandaoParams,
  BeaconStateIdParams,
  BeaconSyncCommitteesParams,
  BeaconValidatorBalancesParams,
  BeaconValidatorByIdParams,
  BeaconValidatorsParams,
  BundlerNetworkParams,
  ComputeRarityParams,
  DebugBlockParams,
  DebugTraceBlockByHashParams,
  DebugTraceBlockByNumberParams,
  DebugTraceCallParams,
  DebugTraceTransactionParams,
  EstimateUserOperationGasParams,
  GetCollectionMetadataParams,
  GetCollectionsForOwnerParams,
  GetContractMetadataParams,
  GetContractsForOwnerParams,
  GetFloorPriceParams,
  GetNFTMetadataParams,
  GetNFTSalesParams,
  GetNFTsForCollectionParams,
  GetNFTsForContractParams,
  GetNFTsForOwnerParams,
  GetOwnersForContractParams,
  GetOwnersForNFTParams,
  GetSpamContractsParams,
  GetTokenAllowanceParams,
  GetTokenBalancesParams,
  GetTokenMetadataParams,
  GetTransactionReceiptsParams,
  GetUserOperationByHashParams,
  GetUserOperationReceiptParams,
  InvalidateContractParams,
  IsAirdropNFTParams,
  IsHolderOfContractParams,
  IsSpamContractParams,
  MultiChainTokenByAddress,
  MultiChainTransactionHistoryByAddress,
  NftContractsByAddressParams,
  NftsByAddressParams,
  NftV3BaseParams,
  ReportSpamParams,
  SearchContractMetadataParams,
  SendTransactionParams,
  SimulateAssetChangesBundleParams,
  SimulateAssetChangesParams,
  SimulateExecutionBundleParams,
  SimulateExecutionParams,
  SimulateUserOperationAssetChangesParams,
  SolanaGetAssetParams,
  SolanaGetAssetProofParams,
  SolanaGetAssetProofsParams,
  SolanaGetAssetsByAuthorityParams,
  SolanaGetAssetsByCreatorParams,
  SolanaGetAssetsByGroupParams,
  SolanaGetAssetsByOwnerParams,
  SolanaGetAssetSignaturesParams,
  SolanaGetAssetsParams,
  SolanaGetNftEditionsParams,
  SolanaGetTokenAccountsParams,
  SolanaSearchAssetsParams,
  SummarizeNFTAttributesParams,
  SwapParams,
  TokenPriceByAddress,
  TokenPriceByAddressPair,
  TokenPriceBySymbol,
  TokenPriceHistoryBySymbol,
  TraceBlockParams,
  TraceCallParams,
  TraceFilterParams,
  TraceGetParams,
  TraceRawTransactionParams,
  TraceReplayBlockTransactionsParams,
  TraceReplayTransactionParams,
  TraceTransactionParams,
} from "../types/types.js";
import convertHexBalanceToDecimal from "../utils/convertHexBalanceToDecimal.js";
import {
  BeaconClientProvider,
  JsonRpcClientProvider,
  NftV3ClientProvider,
} from "./client-providers.js";

@injectable()
export class AlchemyApi {
  constructor(
    @inject(DI_SYMBOLS.PricesClient) private pricesClient: AxiosInstance,
    @inject(DI_SYMBOLS.MultiChainTokenClient)
    private multiChainTokenClient: AxiosInstance,
    @inject(DI_SYMBOLS.MultiChainTransactionHistoryClient)
    private multiChainTransactionHistoryClient: AxiosInstance,
    @inject(DI_SYMBOLS.NftClient) private nftClient: AxiosInstance,
    @inject(DI_SYMBOLS.AgentWalletServer) private agentWalletServer: string,
    @inject(JsonRpcClientProvider)
    private jsonRpcProvider: JsonRpcClientProvider,
    @inject(NftV3ClientProvider)
    private nftV3Provider: NftV3ClientProvider,
    @inject(BeaconClientProvider)
    private beaconProvider: BeaconClientProvider,
  ) {}

  async getTokenPriceBySymbol(params: TokenPriceBySymbol) {
    try {
      const queryParams = new URLSearchParams();
      params.symbols.forEach((symbol) => {
        queryParams.append("symbols", symbol.toUpperCase());
      });

      const response = await this.pricesClient.get(`/by-symbol?${queryParams}`);

      return response.data;
    } catch (error) {
      console.error("Error fetching token prices:", error);
      throw error;
    }
  }

  async getTokenPriceByAddress(params: TokenPriceByAddress) {
    try {
      const response = await this.pricesClient.post("/by-address", {
        addresses: params.addresses.map((pair: TokenPriceByAddressPair) => ({
          address: pair.address,
          network: pair.network,
        })),
      });

      console.log("Successfully fetched token price:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching token price:", error);
      throw error;
    }
  }

  async getTokenPriceHistoryBySymbol(params: TokenPriceHistoryBySymbol) {
    console.log("Fetching token price history for symbol:", params.symbol);
    try {
      const response = await this.pricesClient.post("/historical", {
        ...params,
      });

      console.log("Successfully fetched token price history:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching token price history:", error);
      throw error;
    }
  }

  async getTokensByMultichainAddress(params: MultiChainTokenByAddress) {
    try {
      const response = await this.multiChainTokenClient.post("/by-address", {
        addresses: params.addresses.map((pair: AddressPair) => ({
          address: pair.address,
          networks: pair.networks,
        })),
      });

      const responseData = convertHexBalanceToDecimal(response);
      return responseData;
    } catch (error) {
      console.error("Error fetching token data:", error);
      throw error;
    }
  }

  async getTransactionHistoryByMultichainAddress(
    params: MultiChainTransactionHistoryByAddress,
  ) {
    try {
      const { addresses: _addresses, ...otherParams } = params;

      const response = await this.multiChainTransactionHistoryClient.post(
        "/by-address",
        {
          addresses: params.addresses.map((pair: AddressPair) => ({
            address: pair.address,
            networks: pair.networks,
          })),
          ...otherParams,
        },
      );

      return response.data;
    } catch (error) {
      console.error("Error fetching transaction history:", error);
      throw error;
    }
  }

  async getAssetTransfers(params: AssetTransfersParams) {
    const { network, ...otherParams } = params;
    try {
      const client = this.jsonRpcProvider.get(network);

      const response = await client.post("", {
        method: "alchemy_getAssetTransfers",
        params: [
          {
            ...otherParams,
          },
        ],
      });

      return response.data;
    } catch (error) {
      console.error("Error fetching asset transfers:", error);
      throw error;
    }
  }

  async getNftsForAddress(params: NftsByAddressParams) {
    try {
      const response = await this.nftClient.post("/by-address", {
        ...params,
      });

      return response.data;
    } catch (error) {
      console.error("Error fetching NFTs for address:", error);
      throw error;
    }
  }

  async getNftContractsByAddress(params: NftContractsByAddressParams) {
    try {
      const response = await this.nftClient.post("/by-address", {
        ...params,
      });

      return response.data;
    } catch (error) {
      console.error("Error fetching NFT contracts by address:", error);
      throw error;
    }
  }

  async sendTransaction(params: SendTransactionParams) {
    const {
      ownerScaAccountAddress,
      signerAddress,
      toAddress,
      value,
      callData,
    } = params;
    try {
      const response = await fetch(
        `${this.agentWalletServer}/transactions/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ownerScaAccountAddress,
            signerAddress,
            toAddress,
            value,
            callData,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Error sending transaction:", error);
      throw error;
    }
  }

  async swap(params: SwapParams) {
    const { ownerScaAccountAddress, signerAddress } = params;
    console.error("SWAPPING TOKENS");
    try {
      const response = await fetch(
        `${this.agentWalletServer}/transactions/swap`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ownerScaAccountAddress,
            signerAddress,
          }),
        },
      );

      console.error("SWAPPING TOKENS RESPONSE", response);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Error in swap:", error);
      throw error;
    }
  }

  // ========================================
  // NFT V3 API (single-chain GET endpoints)
  // ========================================

  private buildNftV3QueryString(
    params: Record<string, unknown>,
    excludeKeys: string[] = ["network"],
  ): string {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (excludeKeys.includes(key) || value === undefined || value === null)
        continue;
      if (Array.isArray(value)) {
        value.forEach((v) =>
          qs.append(`${key}[]`, String(v as string | number | boolean)),
        );
      } else if (typeof value === "object") {
        continue;
      } else {
        qs.append(key, String(value as string | number | boolean));
      }
    }
    return qs.toString();
  }

  private async nftV3Get(endpoint: string, params: NftV3BaseParams) {
    const { network, ...rest } = params as NftV3BaseParams &
      Record<string, unknown>;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(
        qs ? `/${endpoint}?${qs}` : `/${endpoint}`,
      );
      return response.data;
    } catch (error) {
      console.error(`Error in NFT V3 ${endpoint}:`, error);
      throw error;
    }
  }

  async getNFTsForOwner(params: GetNFTsForOwnerParams) {
    return this.nftV3Get("getNFTsForOwner", params);
  }

  async getNFTsForContract(params: GetNFTsForContractParams) {
    return this.nftV3Get("getNFTsForContract", params);
  }

  async getNFTsForCollection(params: GetNFTsForCollectionParams) {
    return this.nftV3Get("getNFTsForCollection", params);
  }

  async getNFTMetadata(params: GetNFTMetadataParams) {
    return this.nftV3Get("getNFTMetadata", params);
  }

  async getContractMetadata(params: GetContractMetadataParams) {
    return this.nftV3Get("getContractMetadata", params);
  }

  async getCollectionMetadata(params: GetCollectionMetadataParams) {
    return this.nftV3Get("getCollectionMetadata", params);
  }

  async invalidateContract(params: InvalidateContractParams) {
    return this.nftV3Get("invalidateContract", params);
  }

  async getOwnersForNFT(params: GetOwnersForNFTParams) {
    return this.nftV3Get("getOwnersForNFT", params);
  }

  async getOwnersForContract(params: GetOwnersForContractParams) {
    return this.nftV3Get("getOwnersForContract", params);
  }

  async getSpamContracts(params: GetSpamContractsParams) {
    return this.nftV3Get("getSpamContracts", params);
  }

  async isSpamContract(params: IsSpamContractParams) {
    return this.nftV3Get("isSpamContract", params);
  }

  async isAirdropNFT(params: IsAirdropNFTParams) {
    return this.nftV3Get("isAirdropNFT", params);
  }

  async summarizeNFTAttributes(params: SummarizeNFTAttributesParams) {
    return this.nftV3Get("summarizeNFTAttributes", params);
  }

  async getFloorPrice(params: GetFloorPriceParams) {
    return this.nftV3Get("getFloorPrice", params);
  }

  async searchContractMetadata(params: SearchContractMetadataParams) {
    return this.nftV3Get("searchContractMetadata", params);
  }

  async isHolderOfContract(params: IsHolderOfContractParams) {
    return this.nftV3Get("isHolderOfContract", params);
  }

  async computeRarity(params: ComputeRarityParams) {
    return this.nftV3Get("computeRarity", params);
  }

  async getNFTSales(params: GetNFTSalesParams) {
    return this.nftV3Get("getNFTSales", params);
  }

  async getContractsForOwner(params: GetContractsForOwnerParams) {
    return this.nftV3Get("getContractsForOwner", params);
  }

  async getCollectionsForOwner(params: GetCollectionsForOwnerParams) {
    return this.nftV3Get("getCollectionsForOwner", params);
  }

  async reportSpam(params: ReportSpamParams) {
    return this.nftV3Get("reportSpam", params);
  }

  // ========================================
  // Token API (JSON-RPC)
  // ========================================

  async getTokenAllowance(params: GetTokenAllowanceParams) {
    const { network, contract, owner, spender } = params;
    try {
      const client = this.jsonRpcProvider.get(network);
      const response = await client.post("", {
        method: "alchemy_getTokenAllowance",
        params: [{ contract, owner, spender }],
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching token allowance:", error);
      throw error;
    }
  }

  async getTokenBalances(params: GetTokenBalancesParams) {
    const { network, address, tokenSpec, pageKey, maxCount } = params;
    try {
      const client = this.jsonRpcProvider.get(network);
      const rpcParams: unknown[] = [address];
      if (tokenSpec !== undefined) {
        rpcParams.push(tokenSpec);
      } else {
        rpcParams.push("erc20");
      }
      if (pageKey !== undefined || maxCount !== undefined) {
        const options: Record<string, unknown> = {};
        if (pageKey !== undefined) options.pageKey = pageKey;
        if (maxCount !== undefined) options.maxCount = maxCount;
        rpcParams.push(options);
      }
      const response = await client.post("", {
        method: "alchemy_getTokenBalances",
        params: rpcParams,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching token balances:", error);
      throw error;
    }
  }

  async getTokenMetadata(params: GetTokenMetadataParams) {
    const { network, contractAddress } = params;
    try {
      const client = this.jsonRpcProvider.get(network);
      const response = await client.post("", {
        method: "alchemy_getTokenMetadata",
        params: [contractAddress],
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching token metadata:", error);
      throw error;
    }
  }

  // ========================================
  // Transaction Receipt API (JSON-RPC)
  // ========================================

  async getTransactionReceipts(params: GetTransactionReceiptsParams) {
    const { network, blockNumber, blockHash } = params;
    try {
      const client = this.jsonRpcProvider.get(network);
      const requestParams: Record<string, string> = {};
      if (blockNumber) requestParams.blockNumber = blockNumber;
      if (blockHash) requestParams.blockHash = blockHash;
      const response = await client.post("", {
        method: "alchemy_getTransactionReceipts",
        params: [requestParams],
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching transaction receipts:", error);
      throw error;
    }
  }

  // ========================================
  // Debug API (JSON-RPC)
  // ========================================

  private async callJsonRpc(
    network: string,
    method: string,
    params: unknown[],
  ) {
    try {
      const client = this.jsonRpcProvider.get(network);
      const response = await client.post("", { method, params });
      return response.data;
    } catch (error) {
      console.error(`Error in ${method}:`, error);
      throw error;
    }
  }

  async debugGetRawBlock(params: DebugBlockParams) {
    return this.callJsonRpc(params.network, "debug_getRawBlock", [
      params.blockNumberOrTag,
    ]);
  }

  async debugGetRawHeader(params: DebugBlockParams) {
    return this.callJsonRpc(params.network, "debug_getRawHeader", [
      params.blockNumberOrTag,
    ]);
  }

  async debugGetRawReceipts(params: DebugBlockParams) {
    return this.callJsonRpc(params.network, "debug_getRawReceipts", [
      params.blockNumberOrTag,
    ]);
  }

  async debugTraceBlockByHash(params: DebugTraceBlockByHashParams) {
    const rpcParams: unknown[] = [params.blockHash];
    if (params.tracer) rpcParams.push(params.tracer);
    return this.callJsonRpc(
      params.network,
      "debug_traceBlockByHash",
      rpcParams,
    );
  }

  async debugTraceBlockByNumber(params: DebugTraceBlockByNumberParams) {
    const rpcParams: unknown[] = [params.blockNumberOrTag];
    if (params.tracer) rpcParams.push(params.tracer);
    return this.callJsonRpc(
      params.network,
      "debug_traceBlockByNumber",
      rpcParams,
    );
  }

  async debugTraceCall(params: DebugTraceCallParams) {
    const rpcParams: unknown[] = [params.transaction, params.blockIdentifier];
    if (params.options) rpcParams.push(params.options);
    return this.callJsonRpc(params.network, "debug_traceCall", rpcParams);
  }

  async debugTraceTransaction(params: DebugTraceTransactionParams) {
    const rpcParams: unknown[] = [params.transactionHash];
    if (params.options) rpcParams.push(params.options);
    return this.callJsonRpc(
      params.network,
      "debug_traceTransaction",
      rpcParams,
    );
  }

  // ========================================
  // Trace API (JSON-RPC)
  // ========================================

  async traceBlock(params: TraceBlockParams) {
    return this.callJsonRpc(params.network, "trace_block", [
      params.blockIdentifier,
    ]);
  }

  async traceCall(params: TraceCallParams) {
    const rpcParams: unknown[] = [params.transaction, params.traceTypes];
    if (params.blockIdentifier) rpcParams.push(params.blockIdentifier);
    return this.callJsonRpc(params.network, "trace_call", rpcParams);
  }

  async traceGet(params: TraceGetParams) {
    return this.callJsonRpc(params.network, "trace_get", [
      params.transactionHash,
      params.traceIndexes,
    ]);
  }

  async traceRawTransaction(params: TraceRawTransactionParams) {
    return this.callJsonRpc(params.network, "trace_rawTransaction", [
      params.rawTransaction,
      params.traceTypes,
    ]);
  }

  async traceReplayBlockTransactions(
    params: TraceReplayBlockTransactionsParams,
  ) {
    return this.callJsonRpc(params.network, "trace_replayBlockTransactions", [
      params.blockIdentifier,
      params.traceTypes,
    ]);
  }

  async traceReplayTransaction(params: TraceReplayTransactionParams) {
    return this.callJsonRpc(params.network, "trace_replayTransaction", [
      params.transactionHash,
      params.traceTypes,
    ]);
  }

  async traceTransaction(params: TraceTransactionParams) {
    return this.callJsonRpc(params.network, "trace_transaction", [
      params.transactionHash,
    ]);
  }

  async traceFilter(params: TraceFilterParams) {
    const { network, ...filter } = params;
    return this.callJsonRpc(network, "trace_filter", [filter]);
  }

  // ========================================
  // Transaction Simulation API (JSON-RPC)
  // ========================================

  async simulateAssetChanges(params: SimulateAssetChangesParams) {
    return this.callJsonRpc(params.network, "alchemy_simulateAssetChanges", [
      params.transaction,
    ]);
  }

  async simulateAssetChangesBundle(params: SimulateAssetChangesBundleParams) {
    return this.callJsonRpc(
      params.network,
      "alchemy_simulateAssetChangesBundle",
      [params.transactions],
    );
  }

  async simulateExecution(params: SimulateExecutionParams) {
    return this.callJsonRpc(params.network, "alchemy_simulateExecution", [
      params.transaction,
    ]);
  }

  async simulateExecutionBundle(params: SimulateExecutionBundleParams) {
    return this.callJsonRpc(params.network, "alchemy_simulateExecutionBundle", [
      params.transactions,
    ]);
  }

  // ========================================
  // Bundler API (JSON-RPC)
  // ========================================

  async getMaxPriorityFeePerGas(params: BundlerNetworkParams) {
    return this.callJsonRpc(params.network, "rundler_maxPriorityFeePerGas", []);
  }

  async getUserOperationReceipt(params: GetUserOperationReceiptParams) {
    return this.callJsonRpc(params.network, "eth_getUserOperationReceipt", [
      params.userOpHash,
    ]);
  }

  async getSupportedEntryPoints(params: BundlerNetworkParams) {
    return this.callJsonRpc(params.network, "eth_supportedEntryPoints", []);
  }

  async getUserOperationByHash(params: GetUserOperationByHashParams) {
    return this.callJsonRpc(params.network, "eth_getUserOperationByHash", [
      params.userOpHash,
    ]);
  }

  async estimateUserOperationGas(params: EstimateUserOperationGasParams) {
    const rpcParams: unknown[] = [params.userOperation, params.entryPoint];
    if (params.stateOverrideSet) rpcParams.push(params.stateOverrideSet);
    return this.callJsonRpc(
      params.network,
      "eth_estimateUserOperationGas",
      rpcParams,
    );
  }

  // ========================================
  // UserOp Simulation API (JSON-RPC)
  // ========================================

  async simulateUserOperationAssetChanges(
    params: SimulateUserOperationAssetChangesParams,
  ) {
    const rpcParams: unknown[] = [params.userOperation, params.entryPoint];
    if (params.blockNumber) rpcParams.push(params.blockNumber);
    return this.callJsonRpc(
      params.network,
      "alchemy_simulateUserOperationAssetChanges",
      rpcParams,
    );
  }

  // ========================================
  // Beacon API (REST GET)
  // ========================================

  private buildBeaconQueryString(params: Record<string, unknown>): string {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        value.forEach((v) =>
          qs.append(key, String(v as string | number | boolean)),
        );
      } else if (typeof value === "object") {
        continue;
      } else {
        qs.append(key, String(value as string | number | boolean));
      }
    }
    const str = qs.toString();
    return str ? `?${str}` : "";
  }

  private async beaconGet(path: string, network: string) {
    try {
      const client = this.beaconProvider.get(network);
      const response = await client.get(path);
      return response.data;
    } catch (error) {
      console.error(`Error in beacon GET ${path}:`, error);
      throw error;
    }
  }

  async getBeaconGenesis(params: BeaconNetworkParams) {
    return this.beaconGet("/eth/v1/beacon/genesis", params.network);
  }

  async getBeaconBlock(params: BeaconBlockIdParams) {
    return this.beaconGet(
      `/eth/v2/beacon/blocks/${params.blockId}`,
      params.network,
    );
  }

  async getBeaconBlockAttestations(params: BeaconBlockIdParams) {
    return this.beaconGet(
      `/eth/v2/beacon/blocks/${params.blockId}/attestations`,
      params.network,
    );
  }

  async getBeaconBlockRoot(params: BeaconBlockIdParams) {
    return this.beaconGet(
      `/eth/v1/beacon/blocks/${params.blockId}/root`,
      params.network,
    );
  }

  async getBeaconBlobSidecars(params: BeaconBlobSidecarsParams) {
    const qs = this.buildBeaconQueryString({ indices: params.indices });
    return this.beaconGet(
      `/eth/v1/beacon/blob_sidecars/${params.blockId}${qs}`,
      params.network,
    );
  }

  async getBeaconHeaders(params: BeaconHeadersParams) {
    const qs = this.buildBeaconQueryString({
      slot: params.slot,
      parent_root: params.parentRoot,
    });
    return this.beaconGet(`/eth/v1/beacon/headers${qs}`, params.network);
  }

  async getBeaconHeaderByBlockId(params: BeaconBlockIdParams) {
    return this.beaconGet(
      `/eth/v1/beacon/headers/${params.blockId}`,
      params.network,
    );
  }

  async getBeaconPoolVoluntaryExits(params: BeaconNetworkParams) {
    return this.beaconGet(
      "/eth/v1/beacon/pool/voluntary_exits",
      params.network,
    );
  }

  async getBeaconPoolAttestations(params: BeaconNetworkParams) {
    return this.beaconGet("/eth/v2/beacon/pool/attestations", params.network);
  }

  async getBeaconStateCommittees(params: BeaconCommitteesParams) {
    const qs = this.buildBeaconQueryString({
      epoch: params.epoch,
      index: params.index,
      slot: params.slot,
    });
    return this.beaconGet(
      `/eth/v1/beacon/states/${params.stateId}/committees${qs}`,
      params.network,
    );
  }

  async getBeaconStateFinalityCheckpoints(params: BeaconStateIdParams) {
    return this.beaconGet(
      `/eth/v1/beacon/states/${params.stateId}/finality_checkpoints`,
      params.network,
    );
  }

  async getBeaconStateFork(params: BeaconStateIdParams) {
    return this.beaconGet(
      `/eth/v1/beacon/states/${params.stateId}/fork`,
      params.network,
    );
  }

  async getBeaconStatePendingConsolidations(params: BeaconStateIdParams) {
    return this.beaconGet(
      `/eth/v1/beacon/states/${params.stateId}/pending_consolidations`,
      params.network,
    );
  }

  async getBeaconStateRoot(params: BeaconStateIdParams) {
    return this.beaconGet(
      `/eth/v1/beacon/states/${params.stateId}/root`,
      params.network,
    );
  }

  async getBeaconStateSyncCommittees(params: BeaconSyncCommitteesParams) {
    const qs = this.buildBeaconQueryString({ epoch: params.epoch });
    return this.beaconGet(
      `/eth/v1/beacon/states/${params.stateId}/sync_committees${qs}`,
      params.network,
    );
  }

  async getBeaconStateRandao(params: BeaconRandaoParams) {
    const qs = this.buildBeaconQueryString({ epoch: params.epoch });
    return this.beaconGet(
      `/eth/v1/beacon/states/${params.stateId}/randao${qs}`,
      params.network,
    );
  }

  async getBeaconStateValidatorBalances(params: BeaconValidatorBalancesParams) {
    const qs = this.buildBeaconQueryString({ id: params.id });
    return this.beaconGet(
      `/eth/v1/beacon/states/${params.stateId}/validator_balances${qs}`,
      params.network,
    );
  }

  async getBeaconStateValidators(params: BeaconValidatorsParams) {
    const qs = this.buildBeaconQueryString({
      id: params.id,
      status: params.status,
    });
    return this.beaconGet(
      `/eth/v1/beacon/states/${params.stateId}/validators${qs}`,
      params.network,
    );
  }

  async getBeaconStateValidatorById(params: BeaconValidatorByIdParams) {
    return this.beaconGet(
      `/eth/v1/beacon/states/${params.stateId}/validators/${params.validatorId}`,
      params.network,
    );
  }

  async getBeaconBlockRewards(params: BeaconBlockIdParams) {
    return this.beaconGet(
      `/eth/v1/beacon/rewards/blocks/${params.blockId}`,
      params.network,
    );
  }

  async getBeaconConfigSpec(params: BeaconNetworkParams) {
    return this.beaconGet("/eth/v1/config/spec", params.network);
  }

  async getBeaconNodeSyncing(params: BeaconNetworkParams) {
    return this.beaconGet("/eth/v1/node/syncing", params.network);
  }

  async getBeaconNodeVersion(params: BeaconNetworkParams) {
    return this.beaconGet("/eth/v1/node/version", params.network);
  }

  // ========================================
  // Solana DAS API (JSON-RPC)
  // ========================================

  private async callSolanaRpc(
    network: string,
    method: string,
    params: Record<string, unknown>,
  ) {
    try {
      const client = this.jsonRpcProvider.get(network);
      // Solana DAS uses by-name params, but still in JSON-RPC format
      const response = await client.post("", { method, params });
      return response.data;
    } catch (error) {
      console.error(`Error in ${method}:`, error);
      throw error;
    }
  }

  async solanaGetAsset(params: SolanaGetAssetParams) {
    return this.callSolanaRpc(params.network, "getAsset", {
      id: params.id,
    });
  }

  async solanaGetAssets(params: SolanaGetAssetsParams) {
    return this.callSolanaRpc(params.network, "getAssets", {
      ids: params.ids,
    });
  }

  async solanaGetAssetProof(params: SolanaGetAssetProofParams) {
    return this.callSolanaRpc(params.network, "getAssetProof", {
      id: params.id,
    });
  }

  async solanaGetAssetProofs(params: SolanaGetAssetProofsParams) {
    return this.callSolanaRpc(params.network, "getAssetProofs", {
      ids: params.ids,
    });
  }

  async solanaGetAssetsByAuthority(params: SolanaGetAssetsByAuthorityParams) {
    const { network, ...rest } = params;
    return this.callSolanaRpc(network, "getAssetsByAuthority", rest);
  }

  async solanaGetAssetsByCreator(params: SolanaGetAssetsByCreatorParams) {
    const { network, ...rest } = params;
    return this.callSolanaRpc(network, "getAssetsByCreator", rest);
  }

  async solanaGetAssetsByGroup(params: SolanaGetAssetsByGroupParams) {
    const { network, ...rest } = params;
    return this.callSolanaRpc(network, "getAssetsByGroup", rest);
  }

  async solanaGetAssetsByOwner(params: SolanaGetAssetsByOwnerParams) {
    const { network, ...rest } = params;
    return this.callSolanaRpc(network, "getAssetsByOwner", rest);
  }

  async solanaGetAssetSignatures(params: SolanaGetAssetSignaturesParams) {
    const { network, ...rest } = params;
    return this.callSolanaRpc(network, "getAssetSignatures", rest);
  }

  async solanaGetNftEditions(params: SolanaGetNftEditionsParams) {
    const { network, ...rest } = params;
    return this.callSolanaRpc(network, "getNftEditions", rest);
  }

  async solanaGetTokenAccounts(params: SolanaGetTokenAccountsParams) {
    const { network, ...rest } = params;
    return this.callSolanaRpc(network, "getTokenAccounts", rest);
  }

  async solanaSearchAssets(params: SolanaSearchAssetsParams) {
    const { network, ...rest } = params;
    return this.callSolanaRpc(network, "searchAssets", rest);
  }
}
