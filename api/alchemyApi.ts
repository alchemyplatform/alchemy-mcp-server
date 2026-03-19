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

  async getNFTsForOwner(params: GetNFTsForOwnerParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/getNFTsForOwner?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching NFTs for owner:", error);
      throw error;
    }
  }

  async getNFTsForContract(params: GetNFTsForContractParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/getNFTsForContract?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching NFTs for contract:", error);
      throw error;
    }
  }

  async getNFTsForCollection(params: GetNFTsForCollectionParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/getNFTsForCollection?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching NFTs for collection:", error);
      throw error;
    }
  }

  async getNFTMetadata(params: GetNFTMetadataParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/getNFTMetadata?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching NFT metadata:", error);
      throw error;
    }
  }

  async getContractMetadata(params: GetContractMetadataParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/getContractMetadata?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching contract metadata:", error);
      throw error;
    }
  }

  async getCollectionMetadata(params: GetCollectionMetadataParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/getCollectionMetadata?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching collection metadata:", error);
      throw error;
    }
  }

  async invalidateContract(params: InvalidateContractParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/invalidateContract?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error invalidating contract:", error);
      throw error;
    }
  }

  async getOwnersForNFT(params: GetOwnersForNFTParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/getOwnersForNFT?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching owners for NFT:", error);
      throw error;
    }
  }

  async getOwnersForContract(params: GetOwnersForContractParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/getOwnersForContract?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching owners for contract:", error);
      throw error;
    }
  }

  async getSpamContracts(params: GetSpamContractsParams) {
    const { network } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const response = await client.get("/getSpamContracts");
      return response.data;
    } catch (error) {
      console.error("Error fetching spam contracts:", error);
      throw error;
    }
  }

  async isSpamContract(params: IsSpamContractParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/isSpamContract?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error checking spam contract:", error);
      throw error;
    }
  }

  async isAirdropNFT(params: IsAirdropNFTParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/isAirdropNFT?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error checking airdrop NFT:", error);
      throw error;
    }
  }

  async summarizeNFTAttributes(params: SummarizeNFTAttributesParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/summarizeNFTAttributes?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error summarizing NFT attributes:", error);
      throw error;
    }
  }

  async getFloorPrice(params: GetFloorPriceParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/getFloorPrice?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching floor price:", error);
      throw error;
    }
  }

  async searchContractMetadata(params: SearchContractMetadataParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/searchContractMetadata?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error searching contract metadata:", error);
      throw error;
    }
  }

  async isHolderOfContract(params: IsHolderOfContractParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/isHolderOfContract?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error checking holder of contract:", error);
      throw error;
    }
  }

  async computeRarity(params: ComputeRarityParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/computeRarity?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error computing rarity:", error);
      throw error;
    }
  }

  async getNFTSales(params: GetNFTSalesParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/getNFTSales?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching NFT sales:", error);
      throw error;
    }
  }

  async getContractsForOwner(params: GetContractsForOwnerParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/getContractsForOwner?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching contracts for owner:", error);
      throw error;
    }
  }

  async getCollectionsForOwner(params: GetCollectionsForOwnerParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/getCollectionsForOwner?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching collections for owner:", error);
      throw error;
    }
  }

  async reportSpam(params: ReportSpamParams) {
    const { network, ...rest } = params;
    try {
      const client = this.nftV3Provider.get(network);
      const qs = this.buildNftV3QueryString(rest);
      const response = await client.get(`/reportSpam?${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error reporting spam:", error);
      throw error;
    }
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
    const client = this.jsonRpcProvider.get(network);
    const response = await client.post("", { method, params });
    return response.data;
  }

  async debugGetRawBlock(params: DebugBlockParams) {
    try {
      return await this.callJsonRpc(params.network, "debug_getRawBlock", [
        params.blockNumberOrTag,
      ]);
    } catch (error) {
      console.error("Error in debug_getRawBlock:", error);
      throw error;
    }
  }

  async debugGetRawHeader(params: DebugBlockParams) {
    try {
      return await this.callJsonRpc(params.network, "debug_getRawHeader", [
        params.blockNumberOrTag,
      ]);
    } catch (error) {
      console.error("Error in debug_getRawHeader:", error);
      throw error;
    }
  }

  async debugGetRawReceipts(params: DebugBlockParams) {
    try {
      return await this.callJsonRpc(params.network, "debug_getRawReceipts", [
        params.blockNumberOrTag,
      ]);
    } catch (error) {
      console.error("Error in debug_getRawReceipts:", error);
      throw error;
    }
  }

  async debugTraceBlockByHash(params: DebugTraceBlockByHashParams) {
    const rpcParams: unknown[] = [params.blockHash];
    if (params.tracer) rpcParams.push(params.tracer);
    try {
      return await this.callJsonRpc(
        params.network,
        "debug_traceBlockByHash",
        rpcParams,
      );
    } catch (error) {
      console.error("Error in debug_traceBlockByHash:", error);
      throw error;
    }
  }

  async debugTraceBlockByNumber(params: DebugTraceBlockByNumberParams) {
    const rpcParams: unknown[] = [params.blockNumberOrTag];
    if (params.tracer) rpcParams.push(params.tracer);
    try {
      return await this.callJsonRpc(
        params.network,
        "debug_traceBlockByNumber",
        rpcParams,
      );
    } catch (error) {
      console.error("Error in debug_traceBlockByNumber:", error);
      throw error;
    }
  }

  async debugTraceCall(params: DebugTraceCallParams) {
    const rpcParams: unknown[] = [params.transaction, params.blockIdentifier];
    if (params.options) rpcParams.push(params.options);
    try {
      return await this.callJsonRpc(
        params.network,
        "debug_traceCall",
        rpcParams,
      );
    } catch (error) {
      console.error("Error in debug_traceCall:", error);
      throw error;
    }
  }

  async debugTraceTransaction(params: DebugTraceTransactionParams) {
    const rpcParams: unknown[] = [params.transactionHash];
    if (params.options) rpcParams.push(params.options);
    try {
      return await this.callJsonRpc(
        params.network,
        "debug_traceTransaction",
        rpcParams,
      );
    } catch (error) {
      console.error("Error in debug_traceTransaction:", error);
      throw error;
    }
  }

  // ========================================
  // Trace API (JSON-RPC)
  // ========================================

  async traceBlock(params: TraceBlockParams) {
    try {
      return await this.callJsonRpc(params.network, "trace_block", [
        params.blockIdentifier,
      ]);
    } catch (error) {
      console.error("Error in trace_block:", error);
      throw error;
    }
  }

  async traceCall(params: TraceCallParams) {
    const rpcParams: unknown[] = [params.transaction, params.traceTypes];
    if (params.blockIdentifier) rpcParams.push(params.blockIdentifier);
    try {
      return await this.callJsonRpc(params.network, "trace_call", rpcParams);
    } catch (error) {
      console.error("Error in trace_call:", error);
      throw error;
    }
  }

  async traceGet(params: TraceGetParams) {
    try {
      return await this.callJsonRpc(params.network, "trace_get", [
        params.transactionHash,
        params.traceIndexes,
      ]);
    } catch (error) {
      console.error("Error in trace_get:", error);
      throw error;
    }
  }

  async traceRawTransaction(params: TraceRawTransactionParams) {
    try {
      return await this.callJsonRpc(params.network, "trace_rawTransaction", [
        params.rawTransaction,
        params.traceTypes,
      ]);
    } catch (error) {
      console.error("Error in trace_rawTransaction:", error);
      throw error;
    }
  }

  async traceReplayBlockTransactions(
    params: TraceReplayBlockTransactionsParams,
  ) {
    try {
      return await this.callJsonRpc(
        params.network,
        "trace_replayBlockTransactions",
        [params.blockIdentifier, params.traceTypes],
      );
    } catch (error) {
      console.error("Error in trace_replayBlockTransactions:", error);
      throw error;
    }
  }

  async traceReplayTransaction(params: TraceReplayTransactionParams) {
    try {
      return await this.callJsonRpc(params.network, "trace_replayTransaction", [
        params.transactionHash,
        params.traceTypes,
      ]);
    } catch (error) {
      console.error("Error in trace_replayTransaction:", error);
      throw error;
    }
  }

  async traceTransaction(params: TraceTransactionParams) {
    try {
      return await this.callJsonRpc(params.network, "trace_transaction", [
        params.transactionHash,
      ]);
    } catch (error) {
      console.error("Error in trace_transaction:", error);
      throw error;
    }
  }

  async traceFilter(params: TraceFilterParams) {
    const { network, ...filter } = params;
    try {
      return await this.callJsonRpc(network, "trace_filter", [filter]);
    } catch (error) {
      console.error("Error in trace_filter:", error);
      throw error;
    }
  }

  // ========================================
  // Transaction Simulation API (JSON-RPC)
  // ========================================

  async simulateAssetChanges(params: SimulateAssetChangesParams) {
    try {
      return await this.callJsonRpc(
        params.network,
        "alchemy_simulateAssetChanges",
        [params.transaction],
      );
    } catch (error) {
      console.error("Error in simulateAssetChanges:", error);
      throw error;
    }
  }

  async simulateAssetChangesBundle(params: SimulateAssetChangesBundleParams) {
    try {
      return await this.callJsonRpc(
        params.network,
        "alchemy_simulateAssetChangesBundle",
        [params.transactions],
      );
    } catch (error) {
      console.error("Error in simulateAssetChangesBundle:", error);
      throw error;
    }
  }

  async simulateExecution(params: SimulateExecutionParams) {
    try {
      return await this.callJsonRpc(
        params.network,
        "alchemy_simulateExecution",
        [params.transaction],
      );
    } catch (error) {
      console.error("Error in simulateExecution:", error);
      throw error;
    }
  }

  async simulateExecutionBundle(params: SimulateExecutionBundleParams) {
    try {
      return await this.callJsonRpc(
        params.network,
        "alchemy_simulateExecutionBundle",
        [params.transactions],
      );
    } catch (error) {
      console.error("Error in simulateExecutionBundle:", error);
      throw error;
    }
  }

  // ========================================
  // Bundler API (JSON-RPC)
  // ========================================

  async getMaxPriorityFeePerGas(params: BundlerNetworkParams) {
    try {
      return await this.callJsonRpc(
        params.network,
        "rundler_maxPriorityFeePerGas",
        [],
      );
    } catch (error) {
      console.error("Error in rundler_maxPriorityFeePerGas:", error);
      throw error;
    }
  }

  async getUserOperationReceipt(params: GetUserOperationReceiptParams) {
    try {
      return await this.callJsonRpc(
        params.network,
        "eth_getUserOperationReceipt",
        [params.userOpHash],
      );
    } catch (error) {
      console.error("Error in eth_getUserOperationReceipt:", error);
      throw error;
    }
  }

  async getSupportedEntryPoints(params: BundlerNetworkParams) {
    try {
      return await this.callJsonRpc(
        params.network,
        "eth_supportedEntryPoints",
        [],
      );
    } catch (error) {
      console.error("Error in eth_supportedEntryPoints:", error);
      throw error;
    }
  }

  async getUserOperationByHash(params: GetUserOperationByHashParams) {
    try {
      return await this.callJsonRpc(
        params.network,
        "eth_getUserOperationByHash",
        [params.userOpHash],
      );
    } catch (error) {
      console.error("Error in eth_getUserOperationByHash:", error);
      throw error;
    }
  }

  async estimateUserOperationGas(params: EstimateUserOperationGasParams) {
    const rpcParams: unknown[] = [params.userOperation, params.entryPoint];
    if (params.stateOverrideSet) rpcParams.push(params.stateOverrideSet);
    try {
      return await this.callJsonRpc(
        params.network,
        "eth_estimateUserOperationGas",
        rpcParams,
      );
    } catch (error) {
      console.error("Error in eth_estimateUserOperationGas:", error);
      throw error;
    }
  }

  // ========================================
  // UserOp Simulation API (JSON-RPC)
  // ========================================

  async simulateUserOperationAssetChanges(
    params: SimulateUserOperationAssetChangesParams,
  ) {
    const rpcParams: unknown[] = [params.userOperation, params.entryPoint];
    if (params.blockNumber) rpcParams.push(params.blockNumber);
    try {
      return await this.callJsonRpc(
        params.network,
        "alchemy_simulateUserOperationAssetChanges",
        rpcParams,
      );
    } catch (error) {
      console.error("Error in simulateUserOperationAssetChanges:", error);
      throw error;
    }
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
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get("/eth/v1/beacon/genesis");
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon genesis:", error);
      throw error;
    }
  }

  async getBeaconBlock(params: BeaconBlockIdParams) {
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get(
        `/eth/v2/beacon/blocks/${params.blockId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon block:", error);
      throw error;
    }
  }

  async getBeaconBlockAttestations(params: BeaconBlockIdParams) {
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get(
        `/eth/v2/beacon/blocks/${params.blockId}/attestations`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon block attestations:", error);
      throw error;
    }
  }

  async getBeaconBlockRoot(params: BeaconBlockIdParams) {
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get(
        `/eth/v1/beacon/blocks/${params.blockId}/root`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon block root:", error);
      throw error;
    }
  }

  async getBeaconBlobSidecars(params: BeaconBlobSidecarsParams) {
    const qs = this.buildBeaconQueryString({ indices: params.indices });
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get(
        `/eth/v1/beacon/blob_sidecars/${params.blockId}${qs}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon blob sidecars:", error);
      throw error;
    }
  }

  async getBeaconHeaders(params: BeaconHeadersParams) {
    const qs = this.buildBeaconQueryString({
      slot: params.slot,
      parent_root: params.parentRoot,
    });
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get(`/eth/v1/beacon/headers${qs}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon headers:", error);
      throw error;
    }
  }

  async getBeaconHeaderByBlockId(params: BeaconBlockIdParams) {
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get(
        `/eth/v1/beacon/headers/${params.blockId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon header:", error);
      throw error;
    }
  }

  async getBeaconPoolVoluntaryExits(params: BeaconNetworkParams) {
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get("/eth/v1/beacon/pool/voluntary_exits");
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon pool voluntary exits:", error);
      throw error;
    }
  }

  async getBeaconPoolAttestations(params: BeaconNetworkParams) {
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get("/eth/v2/beacon/pool/attestations");
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon pool attestations:", error);
      throw error;
    }
  }

  async getBeaconStateCommittees(params: BeaconCommitteesParams) {
    const qs = this.buildBeaconQueryString({
      epoch: params.epoch,
      index: params.index,
      slot: params.slot,
    });
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get(
        `/eth/v1/beacon/states/${params.stateId}/committees${qs}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon state committees:", error);
      throw error;
    }
  }

  async getBeaconStateFinalityCheckpoints(params: BeaconStateIdParams) {
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get(
        `/eth/v1/beacon/states/${params.stateId}/finality_checkpoints`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon finality checkpoints:", error);
      throw error;
    }
  }

  async getBeaconStateFork(params: BeaconStateIdParams) {
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get(
        `/eth/v1/beacon/states/${params.stateId}/fork`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon state fork:", error);
      throw error;
    }
  }

  async getBeaconStatePendingConsolidations(params: BeaconStateIdParams) {
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get(
        `/eth/v1/beacon/states/${params.stateId}/pending_consolidations`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon pending consolidations:", error);
      throw error;
    }
  }

  async getBeaconStateRoot(params: BeaconStateIdParams) {
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get(
        `/eth/v1/beacon/states/${params.stateId}/root`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon state root:", error);
      throw error;
    }
  }

  async getBeaconStateSyncCommittees(params: BeaconSyncCommitteesParams) {
    const qs = this.buildBeaconQueryString({ epoch: params.epoch });
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get(
        `/eth/v1/beacon/states/${params.stateId}/sync_committees${qs}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon sync committees:", error);
      throw error;
    }
  }

  async getBeaconStateRandao(params: BeaconRandaoParams) {
    const qs = this.buildBeaconQueryString({ epoch: params.epoch });
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get(
        `/eth/v1/beacon/states/${params.stateId}/randao${qs}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon randao:", error);
      throw error;
    }
  }

  async getBeaconStateValidatorBalances(params: BeaconValidatorBalancesParams) {
    const qs = this.buildBeaconQueryString({ id: params.id });
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get(
        `/eth/v1/beacon/states/${params.stateId}/validator_balances${qs}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon validator balances:", error);
      throw error;
    }
  }

  async getBeaconStateValidators(params: BeaconValidatorsParams) {
    const qs = this.buildBeaconQueryString({
      id: params.id,
      status: params.status,
    });
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get(
        `/eth/v1/beacon/states/${params.stateId}/validators${qs}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon validators:", error);
      throw error;
    }
  }

  async getBeaconStateValidatorById(params: BeaconValidatorByIdParams) {
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get(
        `/eth/v1/beacon/states/${params.stateId}/validators/${params.validatorId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon validator:", error);
      throw error;
    }
  }

  async getBeaconBlockRewards(params: BeaconBlockIdParams) {
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get(
        `/eth/v1/beacon/rewards/blocks/${params.blockId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon block rewards:", error);
      throw error;
    }
  }

  async getBeaconConfigSpec(params: BeaconNetworkParams) {
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get("/eth/v1/config/spec");
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon config spec:", error);
      throw error;
    }
  }

  async getBeaconNodeSyncing(params: BeaconNetworkParams) {
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get("/eth/v1/node/syncing");
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon node syncing status:", error);
      throw error;
    }
  }

  async getBeaconNodeVersion(params: BeaconNetworkParams) {
    try {
      const client = this.beaconProvider.get(params.network);
      const response = await client.get("/eth/v1/node/version");
      return response.data;
    } catch (error) {
      console.error("Error fetching beacon node version:", error);
      throw error;
    }
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
    try {
      return await this.callSolanaRpc(params.network, "getAsset", {
        id: params.id,
      });
    } catch (error) {
      console.error("Error in getAsset:", error);
      throw error;
    }
  }

  async solanaGetAssets(params: SolanaGetAssetsParams) {
    try {
      return await this.callSolanaRpc(params.network, "getAssets", {
        ids: params.ids,
      });
    } catch (error) {
      console.error("Error in getAssets:", error);
      throw error;
    }
  }

  async solanaGetAssetProof(params: SolanaGetAssetProofParams) {
    try {
      return await this.callSolanaRpc(params.network, "getAssetProof", {
        id: params.id,
      });
    } catch (error) {
      console.error("Error in getAssetProof:", error);
      throw error;
    }
  }

  async solanaGetAssetProofs(params: SolanaGetAssetProofsParams) {
    try {
      return await this.callSolanaRpc(params.network, "getAssetProofs", {
        ids: params.ids,
      });
    } catch (error) {
      console.error("Error in getAssetProofs:", error);
      throw error;
    }
  }

  async solanaGetAssetsByAuthority(params: SolanaGetAssetsByAuthorityParams) {
    const { network, ...rest } = params;
    try {
      return await this.callSolanaRpc(network, "getAssetsByAuthority", rest);
    } catch (error) {
      console.error("Error in getAssetsByAuthority:", error);
      throw error;
    }
  }

  async solanaGetAssetsByCreator(params: SolanaGetAssetsByCreatorParams) {
    const { network, ...rest } = params;
    try {
      return await this.callSolanaRpc(network, "getAssetsByCreator", rest);
    } catch (error) {
      console.error("Error in getAssetsByCreator:", error);
      throw error;
    }
  }

  async solanaGetAssetsByGroup(params: SolanaGetAssetsByGroupParams) {
    const { network, ...rest } = params;
    try {
      return await this.callSolanaRpc(network, "getAssetsByGroup", rest);
    } catch (error) {
      console.error("Error in getAssetsByGroup:", error);
      throw error;
    }
  }

  async solanaGetAssetsByOwner(params: SolanaGetAssetsByOwnerParams) {
    const { network, ...rest } = params;
    try {
      return await this.callSolanaRpc(network, "getAssetsByOwner", rest);
    } catch (error) {
      console.error("Error in getAssetsByOwner:", error);
      throw error;
    }
  }

  async solanaGetAssetSignatures(params: SolanaGetAssetSignaturesParams) {
    const { network, ...rest } = params;
    try {
      return await this.callSolanaRpc(network, "getAssetSignatures", rest);
    } catch (error) {
      console.error("Error in getAssetSignatures:", error);
      throw error;
    }
  }

  async solanaGetNftEditions(params: SolanaGetNftEditionsParams) {
    const { network, ...rest } = params;
    try {
      return await this.callSolanaRpc(network, "getNftEditions", rest);
    } catch (error) {
      console.error("Error in getNftEditions:", error);
      throw error;
    }
  }

  async solanaGetTokenAccounts(params: SolanaGetTokenAccountsParams) {
    const { network, ...rest } = params;
    try {
      return await this.callSolanaRpc(network, "getTokenAccounts", rest);
    } catch (error) {
      console.error("Error in getTokenAccounts:", error);
      throw error;
    }
  }

  async solanaSearchAssets(params: SolanaSearchAssetsParams) {
    const { network, ...rest } = params;
    try {
      return await this.callSolanaRpc(network, "searchAssets", rest);
    } catch (error) {
      console.error("Error in searchAssets:", error);
      throw error;
    }
  }
}
