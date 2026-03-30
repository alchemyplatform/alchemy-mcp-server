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
    const queryParams = new URLSearchParams();
    params.symbols.forEach((symbol) => {
      queryParams.append("symbols", symbol.toUpperCase());
    });

    const response = await this.pricesClient.get(`/by-symbol?${queryParams}`);

    return response.data;
  }

  async getTokenPriceByAddress(params: TokenPriceByAddress) {
    const response = await this.pricesClient.post("/by-address", {
      addresses: params.addresses.map((pair: TokenPriceByAddressPair) => ({
        address: pair.address,
        network: pair.network,
      })),
    });

    return response.data;
  }

  async getTokenPriceHistoryBySymbol(params: TokenPriceHistoryBySymbol) {
    const response = await this.pricesClient.post("/historical", {
      ...params,
    });

    return response.data;
  }

  async getTokensByMultichainAddress(params: MultiChainTokenByAddress) {
    const response = await this.multiChainTokenClient.post("/by-address", {
      addresses: params.addresses.map((pair: AddressPair) => ({
        address: pair.address,
        networks: pair.networks,
      })),
    });

    const responseData = convertHexBalanceToDecimal(response);
    return responseData;
  }

  async getTransactionHistoryByMultichainAddress(
    params: MultiChainTransactionHistoryByAddress,
  ) {
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
  }

  async getAssetTransfers(params: AssetTransfersParams) {
    const { network, ...otherParams } = params;
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
  }

  async getNftsForAddress(params: NftsByAddressParams) {
    const response = await this.nftClient.post("/by-address", {
      ...params,
    });

    return response.data;
  }

  async getNftContractsByAddress(params: NftContractsByAddressParams) {
    const response = await this.nftClient.post("/by-address", {
      ...params,
    });

    return response.data;
  }

  async sendTransaction(params: SendTransactionParams) {
    if (!this.agentWalletServer) {
      throw new Error(
        "AGENT_WALLET_SERVER is not configured. This feature requires a running wallet agent server. See the README for setup instructions.",
      );
    }
    const {
      ownerScaAccountAddress,
      signerAddress,
      toAddress,
      value,
      callData,
    } = params;
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
  }

  async swap(params: SwapParams) {
    if (!this.agentWalletServer) {
      throw new Error(
        "AGENT_WALLET_SERVER is not configured. This feature requires a running wallet agent server. See the README for setup instructions.",
      );
    }
    const { ownerScaAccountAddress, signerAddress } = params;
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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    const result = await response.json();
    return result.data;
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

  async getNFTsForOwner(params: GetNFTsForOwnerParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/getNFTsForOwner?${qs}`);
    return response.data;
  }

  async getNFTsForContract(params: GetNFTsForContractParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/getNFTsForContract?${qs}`);
    return response.data;
  }

  async getNFTsForCollection(params: GetNFTsForCollectionParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/getNFTsForCollection?${qs}`);
    return response.data;
  }

  async getNFTMetadata(params: GetNFTMetadataParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/getNFTMetadata?${qs}`);
    return response.data;
  }

  async getContractMetadata(params: GetContractMetadataParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/getContractMetadata?${qs}`);
    return response.data;
  }

  async getCollectionMetadata(params: GetCollectionMetadataParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/getCollectionMetadata?${qs}`);
    return response.data;
  }

  async invalidateContract(params: InvalidateContractParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/invalidateContract?${qs}`);
    return response.data;
  }

  async getOwnersForNFT(params: GetOwnersForNFTParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/getOwnersForNFT?${qs}`);
    return response.data;
  }

  async getOwnersForContract(params: GetOwnersForContractParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/getOwnersForContract?${qs}`);
    return response.data;
  }

  async getSpamContracts(params: GetSpamContractsParams) {
    const { network } = params;
    const client = this.nftV3Provider.get(network);
    const response = await client.get("/getSpamContracts");
    return response.data;
  }

  async isSpamContract(params: IsSpamContractParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/isSpamContract?${qs}`);
    return response.data;
  }

  async isAirdropNFT(params: IsAirdropNFTParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/isAirdropNFT?${qs}`);
    return response.data;
  }

  async summarizeNFTAttributes(params: SummarizeNFTAttributesParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/summarizeNFTAttributes?${qs}`);
    return response.data;
  }

  async getFloorPrice(params: GetFloorPriceParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/getFloorPrice?${qs}`);
    return response.data;
  }

  async searchContractMetadata(params: SearchContractMetadataParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/searchContractMetadata?${qs}`);
    return response.data;
  }

  async isHolderOfContract(params: IsHolderOfContractParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/isHolderOfContract?${qs}`);
    return response.data;
  }

  async computeRarity(params: ComputeRarityParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/computeRarity?${qs}`);
    return response.data;
  }

  async getNFTSales(params: GetNFTSalesParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/getNFTSales?${qs}`);
    return response.data;
  }

  async getContractsForOwner(params: GetContractsForOwnerParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/getContractsForOwner?${qs}`);
    return response.data;
  }

  async getCollectionsForOwner(params: GetCollectionsForOwnerParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/getCollectionsForOwner?${qs}`);
    return response.data;
  }

  async reportSpam(params: ReportSpamParams) {
    const { network, ...rest } = params;
    const client = this.nftV3Provider.get(network);
    const qs = this.buildNftV3QueryString(rest);
    const response = await client.get(`/reportSpam?${qs}`);
    return response.data;
  }

  // ========================================
  // Token API (JSON-RPC)
  // ========================================

  async getTokenAllowance(params: GetTokenAllowanceParams) {
    const { network, contract, owner, spender } = params;
    const client = this.jsonRpcProvider.get(network);
    const response = await client.post("", {
      method: "alchemy_getTokenAllowance",
      params: [{ contract, owner, spender }],
    });
    return response.data;
  }

  async getTokenBalances(params: GetTokenBalancesParams) {
    const { network, address, tokenSpec, pageKey, maxCount } = params;
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
  }

  async getTokenMetadata(params: GetTokenMetadataParams) {
    const { network, contractAddress } = params;
    const client = this.jsonRpcProvider.get(network);
    const response = await client.post("", {
      method: "alchemy_getTokenMetadata",
      params: [contractAddress],
    });
    return response.data;
  }

  // ========================================
  // Transaction Receipt API (JSON-RPC)
  // ========================================

  async getTransactionReceipts(params: GetTransactionReceiptsParams) {
    const { network, blockNumber, blockHash } = params;
    const client = this.jsonRpcProvider.get(network);
    const requestParams: Record<string, string> = {};
    if (blockNumber) requestParams.blockNumber = blockNumber;
    if (blockHash) requestParams.blockHash = blockHash;
    const response = await client.post("", {
      method: "alchemy_getTransactionReceipts",
      params: [requestParams],
    });
    return response.data;
  }

  // ========================================
  // Debug API (JSON-RPC)
  // ========================================

  private async callJsonRpc(
    network: string,
    method: string,
    params: unknown[],
  ) {
    const client = this.jsonRpcProvider.get(network);
    const response = await client.post("", { method, params });
    return response.data;
  }

  async debugGetRawBlock(params: DebugBlockParams) {
    return await this.callJsonRpc(params.network, "debug_getRawBlock", [
      params.blockNumberOrTag,
    ]);
  }

  async debugGetRawHeader(params: DebugBlockParams) {
    return await this.callJsonRpc(params.network, "debug_getRawHeader", [
      params.blockNumberOrTag,
    ]);
  }

  async debugGetRawReceipts(params: DebugBlockParams) {
    return await this.callJsonRpc(params.network, "debug_getRawReceipts", [
      params.blockNumberOrTag,
    ]);
  }

  async debugTraceBlockByHash(params: DebugTraceBlockByHashParams) {
    const rpcParams: unknown[] = [params.blockHash];
    if (params.tracer) rpcParams.push(params.tracer);
    return await this.callJsonRpc(
      params.network,
      "debug_traceBlockByHash",
      rpcParams,
    );
  }

  async debugTraceBlockByNumber(params: DebugTraceBlockByNumberParams) {
    const rpcParams: unknown[] = [params.blockNumberOrTag];
    if (params.tracer) rpcParams.push(params.tracer);
    return await this.callJsonRpc(
      params.network,
      "debug_traceBlockByNumber",
      rpcParams,
    );
  }

  async debugTraceCall(params: DebugTraceCallParams) {
    const rpcParams: unknown[] = [params.transaction, params.blockIdentifier];
    if (params.options) rpcParams.push(params.options);
    return await this.callJsonRpc(params.network, "debug_traceCall", rpcParams);
  }

  async debugTraceTransaction(params: DebugTraceTransactionParams) {
    const rpcParams: unknown[] = [params.transactionHash];
    if (params.options) rpcParams.push(params.options);
    return await this.callJsonRpc(
      params.network,
      "debug_traceTransaction",
      rpcParams,
    );
  }

  // ========================================
  // Trace API (JSON-RPC)
  // ========================================

  async traceBlock(params: TraceBlockParams) {
    return await this.callJsonRpc(params.network, "trace_block", [
      params.blockIdentifier,
    ]);
  }

  async traceCall(params: TraceCallParams) {
    const rpcParams: unknown[] = [params.transaction, params.traceTypes];
    if (params.blockIdentifier) rpcParams.push(params.blockIdentifier);
    return await this.callJsonRpc(params.network, "trace_call", rpcParams);
  }

  async traceGet(params: TraceGetParams) {
    return await this.callJsonRpc(params.network, "trace_get", [
      params.transactionHash,
      params.traceIndexes,
    ]);
  }

  async traceRawTransaction(params: TraceRawTransactionParams) {
    return await this.callJsonRpc(params.network, "trace_rawTransaction", [
      params.rawTransaction,
      params.traceTypes,
    ]);
  }

  async traceReplayBlockTransactions(
    params: TraceReplayBlockTransactionsParams,
  ) {
    return await this.callJsonRpc(
      params.network,
      "trace_replayBlockTransactions",
      [params.blockIdentifier, params.traceTypes],
    );
  }

  async traceReplayTransaction(params: TraceReplayTransactionParams) {
    return await this.callJsonRpc(params.network, "trace_replayTransaction", [
      params.transactionHash,
      params.traceTypes,
    ]);
  }

  async traceTransaction(params: TraceTransactionParams) {
    return await this.callJsonRpc(params.network, "trace_transaction", [
      params.transactionHash,
    ]);
  }

  async traceFilter(params: TraceFilterParams) {
    const { network, ...filter } = params;
    return await this.callJsonRpc(network, "trace_filter", [filter]);
  }

  // ========================================
  // Transaction Simulation API (JSON-RPC)
  // ========================================

  async simulateAssetChanges(params: SimulateAssetChangesParams) {
    return await this.callJsonRpc(
      params.network,
      "alchemy_simulateAssetChanges",
      [params.transaction],
    );
  }

  async simulateAssetChangesBundle(params: SimulateAssetChangesBundleParams) {
    return await this.callJsonRpc(
      params.network,
      "alchemy_simulateAssetChangesBundle",
      [params.transactions],
    );
  }

  async simulateExecution(params: SimulateExecutionParams) {
    return await this.callJsonRpc(params.network, "alchemy_simulateExecution", [
      params.transaction,
    ]);
  }

  async simulateExecutionBundle(params: SimulateExecutionBundleParams) {
    return await this.callJsonRpc(
      params.network,
      "alchemy_simulateExecutionBundle",
      [params.transactions],
    );
  }

  // ========================================
  // Bundler API (JSON-RPC)
  // ========================================

  async getMaxPriorityFeePerGas(params: BundlerNetworkParams) {
    return await this.callJsonRpc(
      params.network,
      "rundler_maxPriorityFeePerGas",
      [],
    );
  }

  async getUserOperationReceipt(params: GetUserOperationReceiptParams) {
    return await this.callJsonRpc(
      params.network,
      "eth_getUserOperationReceipt",
      [params.userOpHash],
    );
  }

  async getSupportedEntryPoints(params: BundlerNetworkParams) {
    return await this.callJsonRpc(
      params.network,
      "eth_supportedEntryPoints",
      [],
    );
  }

  async getUserOperationByHash(params: GetUserOperationByHashParams) {
    return await this.callJsonRpc(
      params.network,
      "eth_getUserOperationByHash",
      [params.userOpHash],
    );
  }

  async estimateUserOperationGas(params: EstimateUserOperationGasParams) {
    const rpcParams: unknown[] = [params.userOperation, params.entryPoint];
    if (params.stateOverrideSet) rpcParams.push(params.stateOverrideSet);
    return await this.callJsonRpc(
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
    return await this.callJsonRpc(
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

  async getBeaconGenesis(params: BeaconNetworkParams) {
    const client = this.beaconProvider.get(params.network);
    const response = await client.get("/eth/v1/beacon/genesis");
    return response.data;
  }

  async getBeaconBlock(params: BeaconBlockIdParams) {
    const client = this.beaconProvider.get(params.network);
    const response = await client.get(
      `/eth/v1/beacon/blocks/${params.blockId}`,
    );
    return response.data;
  }

  async getBeaconBlockAttestations(params: BeaconBlockIdParams) {
    const client = this.beaconProvider.get(params.network);
    const response = await client.get(
      `/eth/v1/beacon/blocks/${params.blockId}/attestations`,
    );
    return response.data;
  }

  async getBeaconBlockRoot(params: BeaconBlockIdParams) {
    const client = this.beaconProvider.get(params.network);
    const response = await client.get(
      `/eth/v1/beacon/blocks/${params.blockId}/root`,
    );
    return response.data;
  }

  async getBeaconBlobSidecars(params: BeaconBlobSidecarsParams) {
    const qs = this.buildBeaconQueryString({ indices: params.indices });
    const client = this.beaconProvider.get(params.network);
    const response = await client.get(
      `/eth/v1/beacon/blob_sidecars/${params.blockId}${qs}`,
    );
    return response.data;
  }

  async getBeaconHeaders(params: BeaconHeadersParams) {
    const qs = this.buildBeaconQueryString({
      slot: params.slot,
      parent_root: params.parentRoot,
    });
    const client = this.beaconProvider.get(params.network);
    const response = await client.get(`/eth/v1/beacon/headers${qs}`);
    return response.data;
  }

  async getBeaconHeaderByBlockId(params: BeaconBlockIdParams) {
    const client = this.beaconProvider.get(params.network);
    const response = await client.get(
      `/eth/v1/beacon/headers/${params.blockId}`,
    );
    return response.data;
  }

  async getBeaconPoolVoluntaryExits(params: BeaconNetworkParams) {
    const client = this.beaconProvider.get(params.network);
    const response = await client.get("/eth/v1/beacon/pool/voluntary_exits");
    return response.data;
  }

  async getBeaconPoolAttestations(params: BeaconNetworkParams) {
    const client = this.beaconProvider.get(params.network);
    const response = await client.get("/eth/v1/beacon/pool/attestations");
    return response.data;
  }

  async getBeaconStateCommittees(params: BeaconCommitteesParams) {
    const qs = this.buildBeaconQueryString({
      epoch: params.epoch,
      index: params.index,
      slot: params.slot,
    });
    const client = this.beaconProvider.get(params.network);
    const response = await client.get(
      `/eth/v1/beacon/states/${params.stateId}/committees${qs}`,
    );
    return response.data;
  }

  async getBeaconStateFinalityCheckpoints(params: BeaconStateIdParams) {
    const client = this.beaconProvider.get(params.network);
    const response = await client.get(
      `/eth/v1/beacon/states/${params.stateId}/finality_checkpoints`,
    );
    return response.data;
  }

  async getBeaconStateFork(params: BeaconStateIdParams) {
    const client = this.beaconProvider.get(params.network);
    const response = await client.get(
      `/eth/v1/beacon/states/${params.stateId}/fork`,
    );
    return response.data;
  }

  async getBeaconStatePendingConsolidations(params: BeaconStateIdParams) {
    const client = this.beaconProvider.get(params.network);
    const response = await client.get(
      `/eth/v1/beacon/states/${params.stateId}/pending_consolidations`,
    );
    return response.data;
  }

  async getBeaconStateRoot(params: BeaconStateIdParams) {
    const client = this.beaconProvider.get(params.network);
    const response = await client.get(
      `/eth/v1/beacon/states/${params.stateId}/root`,
    );
    return response.data;
  }

  async getBeaconStateSyncCommittees(params: BeaconSyncCommitteesParams) {
    const qs = this.buildBeaconQueryString({ epoch: params.epoch });
    const client = this.beaconProvider.get(params.network);
    const response = await client.get(
      `/eth/v1/beacon/states/${params.stateId}/sync_committees${qs}`,
    );
    return response.data;
  }

  async getBeaconStateRandao(params: BeaconRandaoParams) {
    const qs = this.buildBeaconQueryString({ epoch: params.epoch });
    const client = this.beaconProvider.get(params.network);
    const response = await client.get(
      `/eth/v1/beacon/states/${params.stateId}/randao${qs}`,
    );
    return response.data;
  }

  async getBeaconStateValidatorBalances(params: BeaconValidatorBalancesParams) {
    const qs = this.buildBeaconQueryString({ id: params.id });
    const client = this.beaconProvider.get(params.network);
    const response = await client.get(
      `/eth/v1/beacon/states/${params.stateId}/validator_balances${qs}`,
    );
    return response.data;
  }

  async getBeaconStateValidators(params: BeaconValidatorsParams) {
    const qs = this.buildBeaconQueryString({
      id: params.id,
      status: params.status,
    });
    const client = this.beaconProvider.get(params.network);
    const response = await client.get(
      `/eth/v1/beacon/states/${params.stateId}/validators${qs}`,
    );
    return response.data;
  }

  async getBeaconStateValidatorById(params: BeaconValidatorByIdParams) {
    const client = this.beaconProvider.get(params.network);
    const response = await client.get(
      `/eth/v1/beacon/states/${params.stateId}/validators/${params.validatorId}`,
    );
    return response.data;
  }

  async getBeaconBlockRewards(params: BeaconBlockIdParams) {
    const client = this.beaconProvider.get(params.network);
    const response = await client.get(
      `/eth/v1/beacon/rewards/blocks/${params.blockId}`,
    );
    return response.data;
  }

  async getBeaconConfigSpec(params: BeaconNetworkParams) {
    const client = this.beaconProvider.get(params.network);
    const response = await client.get("/eth/v1/config/spec");
    return response.data;
  }

  async getBeaconNodeSyncing(params: BeaconNetworkParams) {
    const client = this.beaconProvider.get(params.network);
    const response = await client.get("/eth/v1/node/syncing");
    return response.data;
  }

  async getBeaconNodeVersion(params: BeaconNetworkParams) {
    const client = this.beaconProvider.get(params.network);
    const response = await client.get("/eth/v1/node/version");
    return response.data;
  }

  // ========================================
  // Solana DAS API (JSON-RPC)
  // ========================================

  private async callSolanaRpc(
    network: string,
    method: string,
    params: Record<string, unknown>,
  ) {
    const client = this.jsonRpcProvider.get(network);
    // Solana DAS uses by-name params, but still in JSON-RPC format
    const response = await client.post("", { method, params });
    return response.data;
  }

  async solanaGetAsset(params: SolanaGetAssetParams) {
    return await this.callSolanaRpc(params.network, "getAsset", {
      id: params.id,
    });
  }

  async solanaGetAssets(params: SolanaGetAssetsParams) {
    return await this.callSolanaRpc(params.network, "getAssets", {
      ids: params.ids,
    });
  }

  async solanaGetAssetProof(params: SolanaGetAssetProofParams) {
    return await this.callSolanaRpc(params.network, "getAssetProof", {
      id: params.id,
    });
  }

  async solanaGetAssetProofs(params: SolanaGetAssetProofsParams) {
    return await this.callSolanaRpc(params.network, "getAssetProofs", {
      ids: params.ids,
    });
  }

  async solanaGetAssetsByAuthority(params: SolanaGetAssetsByAuthorityParams) {
    const { network, ...rest } = params;
    return await this.callSolanaRpc(network, "getAssetsByAuthority", rest);
  }

  async solanaGetAssetsByCreator(params: SolanaGetAssetsByCreatorParams) {
    const { network, ...rest } = params;
    return await this.callSolanaRpc(network, "getAssetsByCreator", rest);
  }

  async solanaGetAssetsByGroup(params: SolanaGetAssetsByGroupParams) {
    const { network, ...rest } = params;
    return await this.callSolanaRpc(network, "getAssetsByGroup", rest);
  }

  async solanaGetAssetsByOwner(params: SolanaGetAssetsByOwnerParams) {
    const { network, ...rest } = params;
    return await this.callSolanaRpc(network, "getAssetsByOwner", rest);
  }

  async solanaGetAssetSignatures(params: SolanaGetAssetSignaturesParams) {
    const { network, ...rest } = params;
    return await this.callSolanaRpc(network, "getAssetSignatures", rest);
  }

  async solanaGetNftEditions(params: SolanaGetNftEditionsParams) {
    const { network, ...rest } = params;
    return await this.callSolanaRpc(network, "getNftEditions", rest);
  }

  async solanaGetTokenAccounts(params: SolanaGetTokenAccountsParams) {
    const { network, ...rest } = params;
    return await this.callSolanaRpc(network, "getTokenAccounts", rest);
  }

  async solanaSearchAssets(params: SolanaSearchAssetsParams) {
    const { network, ...rest } = params;
    return await this.callSolanaRpc(network, "searchAssets", rest);
  }
}
