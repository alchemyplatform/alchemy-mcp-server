import dotenv from 'dotenv';
dotenv.config();
import {
  createPricesClient, createMultiChainTokenClient, createMultiChainTransactionHistoryClient,
  createAlchemyJsonRpcClient, createNftClient, createNftV3Client, createSolanaJsonRpcClient,
  createEthBeaconClient, createAptosClient, createNotifyClient, createAdminClient
} from './alchemyClients.js';
import {
  TokenPriceBySymbol, TokenPriceByAddress, TokenPriceByAddressPair, TokenPriceHistoryBySymbol,
  MultiChainTokenByAddress, MultiChainTransactionHistoryByAddress, AssetTransfersParams,
  NftsByAddressParams, NftContractsByAddressParams, AddressPair, SendTransactionParams, SwapParams,
  GetNFTsForOwnerV3Params, GetNFTsForContractParams, GetNFTsForCollectionParams,
  GetNFTMetadataParams, GetContractMetadataParams, GetCollectionMetadataParams,
  GetOwnersForNFTParams, GetOwnersForContractParams, GetContractsForOwnerParams,
  GetCollectionsForOwnerParams, IsSpamContractParams, IsAirdropNFTParams, IsHolderOfContractParams,
  GetFloorPriceParams, GetNFTSalesParams, ComputeRarityParams, SummarizeNFTAttributesParams,
  SearchContractMetadataParams, GetTokenAllowanceParams, GetTokenBalancesParams,
  GetTokenMetadataParams, GetTransactionReceiptsParams, SimulateAssetChangesParams,
  SimulateExecutionParams, TraceTransactionParams, TraceBlockParams, TraceCallParams,
  TraceFilterParams, TraceGetParams, DebugTraceTransactionParams, DebugTraceCallParams,
  DebugTraceBlockByNumberParams, SolanaGetAssetParams, SolanaGetAssetsParams,
  SolanaGetAssetProofParams, SolanaGetAssetsByOwnerParams, SolanaGetAssetsByAuthorityParams,
  SolanaGetAssetsByCreatorParams, SolanaGetAssetsByGroupParams, SolanaSearchAssetsParams,
  SolanaGetAssetSignaturesParams, SolanaGetNftEditionsParams, SolanaGetTokenAccountsParams,
  BeaconBlockParams, BeaconBlobSidecarsParams, BeaconHeadersParams, BeaconStateParams,
  BeaconCommitteesParams, BeaconSyncCommitteesParams, BeaconRandaoParams,
  BeaconValidatorBalancesParams, BeaconValidatorsParams, BeaconValidatorParams,
  AptosAccountParams, AptosAccountResourceParams, AptosAccountModuleParams,
  AptosAccountTransactionsParams, AptosEventsByCreationNumberParams,
  AptosEventsByEventHandleParams, AptosBlockByHeightParams, AptosBlockByVersionParams,
  AptosTransactionsParams, AptosTransactionByHashParams, AptosHealthParams,
  GetWebhookAddressesParams, GetWebhookNftFiltersParams, GetWebhookVariableParams,
  GetGasManagerPolicyParams, GetGasManagerPoliciesParams, GetGasManagerPolicySponsorshipsParams
} from '../types/types.js';
import convertHexBalanceToDecimal from '../utils/convertHexBalanceToDecimal.js';

const AGENT_WALLET_SERVER = process.env.AGENT_WALLET_SERVER;

export const alchemyApi = {

  // ========================================
  // EXISTING: Prices API
  // ========================================

  async getTokenPriceBySymbol(params: TokenPriceBySymbol) {
    try {
      const client = createPricesClient();
      const queryParams = new URLSearchParams();
      params.symbols.forEach(symbol => {
        queryParams.append('symbols', symbol.toUpperCase());
      });
      const response = await client.get(`/by-symbol?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      throw error;
    }
  },

  async getTokenPriceByAddress(params: TokenPriceByAddress) {
    try {
      const client = createPricesClient();
      const response = await client.post('/by-address', {
        addresses: params.addresses.map((pair: TokenPriceByAddressPair) => ({
          address: pair.address,
          network: pair.network
        }))
      });
      console.log('Successfully fetched token price:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching token price:', error);
      throw error;
    }
  },

  async getTokenPriceHistoryBySymbol(params: TokenPriceHistoryBySymbol) {
    console.log('Fetching token price history for symbol:', params.symbol);
    try {
      const client = createPricesClient();
      const response = await client.post('/historical', { ...params });
      console.log('Successfully fetched token price history:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching token price history:', error);
      throw error;
    }
  },

  // ========================================
  // EXISTING: MultiChain Token API
  // ========================================

  async getTokensByMultichainAddress(params: MultiChainTokenByAddress) {
    try {
      const client = createMultiChainTokenClient();
      const response = await client.post('/by-address', {
        addresses: params.addresses.map((pair: AddressPair) => ({
          address: pair.address,
          networks: pair.networks
        }))
      });
      const responseData = convertHexBalanceToDecimal(response);
      return responseData;
    } catch (error) {
      console.error('Error fetching token data:', error);
      throw error;
    }
  },

  // ========================================
  // EXISTING: MultiChain Transaction History API
  // ========================================

  async getTransactionHistoryByMultichainAddress(params: MultiChainTransactionHistoryByAddress) {
    try {
      const { addresses, ...otherParams } = params;
      const client = createMultiChainTransactionHistoryClient();
      const response = await client.post('/by-address', {
        addresses: params.addresses.map((pair: AddressPair) => ({
          address: pair.address,
          networks: pair.networks
        })),
        ...otherParams
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  },

  // ========================================
  // EXISTING: Transfers API
  // ========================================

  async getAssetTransfers(params: AssetTransfersParams) {
    const { network, ...otherParams } = params;
    try {
      const client = createAlchemyJsonRpcClient(network);
      const response = await client.post('', {
        method: "alchemy_getAssetTransfers",
        params: [{ ...otherParams }]
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching asset transfers:', error);
      throw error;
    }
  },

  // ========================================
  // EXISTING: NFT API (multichain)
  // ========================================

  async getNftsForAddress(params: NftsByAddressParams) {
    try {
      const client = createNftClient();
      const response = await client.post('/by-address', { ...params });
      return response.data;
    } catch (error) {
      console.error('Error fetching NFTs for address:', error);
      throw error;
    }
  },

  async getNftContractsByAddress(params: NftContractsByAddressParams) {
    try {
      const client = createNftClient();
      const response = await client.post('/by-address', { ...params });
      return response.data;
    } catch (error) {
      console.error('Error fetching NFT contracts by address:', error);
      throw error;
    }
  },

  // ========================================
  // EXISTING: Wallet API
  // ========================================

  async sendTransaction(params: SendTransactionParams) {
    const { ownerScaAccountAddress, signerAddress, toAddress, value, callData } = params;
    try {
      const response = await fetch(`${AGENT_WALLET_SERVER}/transactions/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerScaAccountAddress, signerAddress, toAddress, value, callData })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  },

  async swap(params: SwapParams) {
    const { ownerScaAccountAddress, signerAddress } = params;
    console.error('SWAPPING TOKENS');
    try {
      const response = await fetch(`${AGENT_WALLET_SERVER}/transactions/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerScaAccountAddress, signerAddress })
      });
      console.error('SWAPPING TOKENS RESPONSE', response);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error in swap:', error);
      throw error;
    }
  },

  // ========================================
  // NEW: NFT v3 API (GET-based)
  // ========================================

  async getNFTsForOwnerV3(params: GetNFTsForOwnerV3Params) {
    try {
      const { network, ...queryParams } = params;
      const client = createNftV3Client(network);
      const response = await client.get('/getNFTsForOwner', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching NFTs for owner:', error);
      throw error;
    }
  },

  async getNFTsForContract(params: GetNFTsForContractParams) {
    try {
      const { network, ...queryParams } = params;
      const client = createNftV3Client(network);
      const response = await client.get('/getNFTsForContract', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching NFTs for contract:', error);
      throw error;
    }
  },

  async getNFTsForCollection(params: GetNFTsForCollectionParams) {
    try {
      const { network, ...queryParams } = params;
      const client = createNftV3Client(network);
      const response = await client.get('/getNFTsForCollection', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching NFTs for collection:', error);
      throw error;
    }
  },

  async getNFTMetadata(params: GetNFTMetadataParams) {
    try {
      const { network, ...queryParams } = params;
      const client = createNftV3Client(network);
      const response = await client.get('/getNFTMetadata', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching NFT metadata:', error);
      throw error;
    }
  },

  async getContractMetadata(params: GetContractMetadataParams) {
    try {
      const { network, ...queryParams } = params;
      const client = createNftV3Client(network);
      const response = await client.get('/getContractMetadata', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching contract metadata:', error);
      throw error;
    }
  },

  async getCollectionMetadata(params: GetCollectionMetadataParams) {
    try {
      const { network, ...queryParams } = params;
      const client = createNftV3Client(network);
      const response = await client.get('/getCollectionMetadata', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching collection metadata:', error);
      throw error;
    }
  },

  async getOwnersForNFT(params: GetOwnersForNFTParams) {
    try {
      const { network, ...queryParams } = params;
      const client = createNftV3Client(network);
      const response = await client.get('/getOwnersForNFT', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching owners for NFT:', error);
      throw error;
    }
  },

  async getOwnersForContract(params: GetOwnersForContractParams) {
    try {
      const { network, ...queryParams } = params;
      const client = createNftV3Client(network);
      const response = await client.get('/getOwnersForContract', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching owners for contract:', error);
      throw error;
    }
  },

  async getContractsForOwner(params: GetContractsForOwnerParams) {
    try {
      const { network, ...queryParams } = params;
      const client = createNftV3Client(network);
      const response = await client.get('/getContractsForOwner', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching contracts for owner:', error);
      throw error;
    }
  },

  async getCollectionsForOwner(params: GetCollectionsForOwnerParams) {
    try {
      const { network, ...queryParams } = params;
      const client = createNftV3Client(network);
      const response = await client.get('/getCollectionsForOwner', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching collections for owner:', error);
      throw error;
    }
  },

  async isSpamContract(params: IsSpamContractParams) {
    try {
      const { network, ...queryParams } = params;
      const client = createNftV3Client(network);
      const response = await client.get('/isSpamContract', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error checking spam contract:', error);
      throw error;
    }
  },

  async isAirdropNFT(params: IsAirdropNFTParams) {
    try {
      const { network, ...queryParams } = params;
      const client = createNftV3Client(network);
      const response = await client.get('/isAirdropNFT', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error checking airdrop NFT:', error);
      throw error;
    }
  },

  async isHolderOfContract(params: IsHolderOfContractParams) {
    try {
      const { network, ...queryParams } = params;
      const client = createNftV3Client(network);
      const response = await client.get('/isHolderOfContract', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error checking holder of contract:', error);
      throw error;
    }
  },

  async getFloorPrice(params: GetFloorPriceParams) {
    try {
      const { network, ...queryParams } = params;
      const client = createNftV3Client(network);
      const response = await client.get('/getFloorPrice', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching floor price:', error);
      throw error;
    }
  },

  async getNFTSales(params: GetNFTSalesParams) {
    try {
      const { network, ...queryParams } = params;
      const client = createNftV3Client(network);
      const response = await client.get('/getNFTSales', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching NFT sales:', error);
      throw error;
    }
  },

  async computeRarity(params: ComputeRarityParams) {
    try {
      const { network, ...queryParams } = params;
      const client = createNftV3Client(network);
      const response = await client.get('/computeRarity', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error computing rarity:', error);
      throw error;
    }
  },

  async summarizeNFTAttributes(params: SummarizeNFTAttributesParams) {
    try {
      const { network, ...queryParams } = params;
      const client = createNftV3Client(network);
      const response = await client.get('/summarizeNFTAttributes', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error summarizing NFT attributes:', error);
      throw error;
    }
  },

  async searchContractMetadata(params: SearchContractMetadataParams) {
    try {
      const { network, ...queryParams } = params;
      const client = createNftV3Client(network);
      const response = await client.get('/searchContractMetadata', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error searching contract metadata:', error);
      throw error;
    }
  },

  // ========================================
  // NEW: Token RPC API (JSON-RPC)
  // ========================================

  async getTokenAllowance(params: GetTokenAllowanceParams) {
    try {
      const { network, ...otherParams } = params;
      const client = createAlchemyJsonRpcClient(network);
      const response = await client.post('', {
        method: "alchemy_getTokenAllowance",
        params: [otherParams]
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching token allowance:', error);
      throw error;
    }
  },

  async getTokenBalances(params: GetTokenBalancesParams) {
    try {
      const { network, address, tokenAddresses } = params;
      const client = createAlchemyJsonRpcClient(network);
      const rpcParams: any[] = [address];
      if (tokenAddresses && tokenAddresses.length > 0) {
        rpcParams.push(tokenAddresses);
      } else {
        rpcParams.push("erc20");
      }
      const response = await client.post('', {
        method: "alchemy_getTokenBalances",
        params: rpcParams
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching token balances:', error);
      throw error;
    }
  },

  async getTokenMetadata(params: GetTokenMetadataParams) {
    try {
      const { network, contractAddress } = params;
      const client = createAlchemyJsonRpcClient(network);
      const response = await client.post('', {
        method: "alchemy_getTokenMetadata",
        params: [contractAddress]
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      throw error;
    }
  },

  // ========================================
  // NEW: Transaction Receipts API (JSON-RPC)
  // ========================================

  async getTransactionReceipts(params: GetTransactionReceiptsParams) {
    try {
      const { network, ...otherParams } = params;
      const client = createAlchemyJsonRpcClient(network);
      const response = await client.post('', {
        method: "alchemy_getTransactionReceipts",
        params: [otherParams]
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching transaction receipts:', error);
      throw error;
    }
  },

  // ========================================
  // NEW: Transaction Simulation API (JSON-RPC)
  // ========================================

  async simulateAssetChanges(params: SimulateAssetChangesParams) {
    try {
      const { network, ...transaction } = params;
      const client = createAlchemyJsonRpcClient(network);
      const response = await client.post('', {
        method: "alchemy_simulateAssetChanges",
        params: [{ ...transaction }]
      });
      return response.data;
    } catch (error) {
      console.error('Error simulating asset changes:', error);
      throw error;
    }
  },

  async simulateExecution(params: SimulateExecutionParams) {
    try {
      const { network, blockTag, ...transaction } = params;
      const client = createAlchemyJsonRpcClient(network);
      const rpcParams: any[] = [{ ...transaction }];
      if (blockTag) rpcParams.push(blockTag);
      const response = await client.post('', {
        method: "alchemy_simulateExecution",
        params: rpcParams
      });
      return response.data;
    } catch (error) {
      console.error('Error simulating execution:', error);
      throw error;
    }
  },

  // ========================================
  // NEW: Trace API (JSON-RPC)
  // ========================================

  async traceTransaction(params: TraceTransactionParams) {
    try {
      const { network, transactionHash } = params;
      const client = createAlchemyJsonRpcClient(network);
      const response = await client.post('', {
        method: "trace_transaction",
        params: [transactionHash]
      });
      return response.data;
    } catch (error) {
      console.error('Error tracing transaction:', error);
      throw error;
    }
  },

  async traceBlock(params: TraceBlockParams) {
    try {
      const { network, blockIdentifier } = params;
      const client = createAlchemyJsonRpcClient(network);
      const response = await client.post('', {
        method: "trace_block",
        params: [blockIdentifier]
      });
      return response.data;
    } catch (error) {
      console.error('Error tracing block:', error);
      throw error;
    }
  },

  async traceCall(params: TraceCallParams) {
    try {
      const { network, traceTypes, blockIdentifier, ...transaction } = params;
      const client = createAlchemyJsonRpcClient(network);
      const rpcParams: any[] = [transaction, traceTypes];
      if (blockIdentifier) rpcParams.push(blockIdentifier);
      const response = await client.post('', {
        method: "trace_call",
        params: rpcParams
      });
      return response.data;
    } catch (error) {
      console.error('Error tracing call:', error);
      throw error;
    }
  },

  async traceFilter(params: TraceFilterParams) {
    try {
      const { network, ...filterParams } = params;
      const client = createAlchemyJsonRpcClient(network);
      const response = await client.post('', {
        method: "trace_filter",
        params: [filterParams]
      });
      return response.data;
    } catch (error) {
      console.error('Error tracing filter:', error);
      throw error;
    }
  },

  async traceGet(params: TraceGetParams) {
    try {
      const { network, transactionHash, traceIndexes } = params;
      const client = createAlchemyJsonRpcClient(network);
      const response = await client.post('', {
        method: "trace_get",
        params: [transactionHash, traceIndexes]
      });
      return response.data;
    } catch (error) {
      console.error('Error getting trace:', error);
      throw error;
    }
  },

  // ========================================
  // NEW: Debug API (JSON-RPC)
  // ========================================

  async debugTraceTransaction(params: DebugTraceTransactionParams) {
    try {
      const { network, transactionHash, tracer, tracerConfig, timeout } = params;
      const client = createAlchemyJsonRpcClient(network);
      const options: any = {};
      if (tracer) options.tracer = tracer;
      if (tracerConfig) options.tracerConfig = tracerConfig;
      if (timeout) options.timeout = timeout;
      const rpcParams: any[] = [transactionHash];
      if (Object.keys(options).length > 0) rpcParams.push(options);
      const response = await client.post('', {
        method: "debug_traceTransaction",
        params: rpcParams
      });
      return response.data;
    } catch (error) {
      console.error('Error debug tracing transaction:', error);
      throw error;
    }
  },

  async debugTraceCall(params: DebugTraceCallParams) {
    try {
      const { network, blockIdentifier, tracer, tracerConfig, ...transaction } = params;
      const client = createAlchemyJsonRpcClient(network);
      const options: any = {};
      if (tracer) options.tracer = tracer;
      if (tracerConfig) options.tracerConfig = tracerConfig;
      const rpcParams: any[] = [transaction, blockIdentifier || "latest"];
      if (Object.keys(options).length > 0) rpcParams.push(options);
      const response = await client.post('', {
        method: "debug_traceCall",
        params: rpcParams
      });
      return response.data;
    } catch (error) {
      console.error('Error debug tracing call:', error);
      throw error;
    }
  },

  async debugTraceBlockByNumber(params: DebugTraceBlockByNumberParams) {
    try {
      const { network, blockNumber, tracer, tracerConfig } = params;
      const client = createAlchemyJsonRpcClient(network);
      const options: any = {};
      if (tracer) options.tracer = tracer;
      if (tracerConfig) options.tracerConfig = tracerConfig;
      const rpcParams: any[] = [blockNumber];
      if (Object.keys(options).length > 0) rpcParams.push(options);
      const response = await client.post('', {
        method: "debug_traceBlockByNumber",
        params: rpcParams
      });
      return response.data;
    } catch (error) {
      console.error('Error debug tracing block by number:', error);
      throw error;
    }
  },

  // ========================================
  // NEW: Solana DAS API (JSON-RPC, named params)
  // ========================================

  async solanaGetAsset(params: SolanaGetAssetParams) {
    try {
      const { network, ...otherParams } = params;
      const client = createSolanaJsonRpcClient(network);
      const response = await client.post('', {
        method: "getAsset",
        params: otherParams
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Solana asset:', error);
      throw error;
    }
  },

  async solanaGetAssets(params: SolanaGetAssetsParams) {
    try {
      const { network, ...otherParams } = params;
      const client = createSolanaJsonRpcClient(network);
      const response = await client.post('', {
        method: "getAssets",
        params: otherParams
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Solana assets:', error);
      throw error;
    }
  },

  async solanaGetAssetProof(params: SolanaGetAssetProofParams) {
    try {
      const { network, ...otherParams } = params;
      const client = createSolanaJsonRpcClient(network);
      const response = await client.post('', {
        method: "getAssetProof",
        params: otherParams
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Solana asset proof:', error);
      throw error;
    }
  },

  async solanaGetAssetsByOwner(params: SolanaGetAssetsByOwnerParams) {
    try {
      const { network, ...otherParams } = params;
      const client = createSolanaJsonRpcClient(network);
      const response = await client.post('', {
        method: "getAssetsByOwner",
        params: otherParams
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Solana assets by owner:', error);
      throw error;
    }
  },

  async solanaGetAssetsByAuthority(params: SolanaGetAssetsByAuthorityParams) {
    try {
      const { network, ...otherParams } = params;
      const client = createSolanaJsonRpcClient(network);
      const response = await client.post('', {
        method: "getAssetsByAuthority",
        params: otherParams
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Solana assets by authority:', error);
      throw error;
    }
  },

  async solanaGetAssetsByCreator(params: SolanaGetAssetsByCreatorParams) {
    try {
      const { network, ...otherParams } = params;
      const client = createSolanaJsonRpcClient(network);
      const response = await client.post('', {
        method: "getAssetsByCreator",
        params: otherParams
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Solana assets by creator:', error);
      throw error;
    }
  },

  async solanaGetAssetsByGroup(params: SolanaGetAssetsByGroupParams) {
    try {
      const { network, ...otherParams } = params;
      const client = createSolanaJsonRpcClient(network);
      const response = await client.post('', {
        method: "getAssetsByGroup",
        params: otherParams
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Solana assets by group:', error);
      throw error;
    }
  },

  async solanaSearchAssets(params: SolanaSearchAssetsParams) {
    try {
      const { network, ...otherParams } = params;
      const client = createSolanaJsonRpcClient(network);
      const response = await client.post('', {
        method: "searchAssets",
        params: otherParams
      });
      return response.data;
    } catch (error) {
      console.error('Error searching Solana assets:', error);
      throw error;
    }
  },

  async solanaGetAssetSignatures(params: SolanaGetAssetSignaturesParams) {
    try {
      const { network, ...otherParams } = params;
      const client = createSolanaJsonRpcClient(network);
      const response = await client.post('', {
        method: "getAssetSignatures",
        params: otherParams
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Solana asset signatures:', error);
      throw error;
    }
  },

  async solanaGetNftEditions(params: SolanaGetNftEditionsParams) {
    try {
      const { network, ...otherParams } = params;
      const client = createSolanaJsonRpcClient(network);
      const response = await client.post('', {
        method: "getNftEditions",
        params: otherParams
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Solana NFT editions:', error);
      throw error;
    }
  },

  async solanaGetTokenAccounts(params: SolanaGetTokenAccountsParams) {
    try {
      const { network, ...otherParams } = params;
      const client = createSolanaJsonRpcClient(network);
      const response = await client.post('', {
        method: "getTokenAccounts",
        params: otherParams
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Solana token accounts:', error);
      throw error;
    }
  },

  // ========================================
  // NEW: Eth Beacon API (GET-based)
  // ========================================

  async beaconGetBlockAttestations(params: BeaconBlockParams) {
    try {
      const client = createEthBeaconClient();
      const response = await client.get(`/eth/v2/beacon/blocks/${params.blockId}/attestations`);
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon block attestations:', error);
      throw error;
    }
  },

  async beaconGetBlockRoot(params: BeaconBlockParams) {
    try {
      const client = createEthBeaconClient();
      const response = await client.get(`/eth/v1/beacon/blocks/${params.blockId}/root`);
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon block root:', error);
      throw error;
    }
  },

  async beaconGetBlobSidecars(params: BeaconBlobSidecarsParams) {
    try {
      const client = createEthBeaconClient();
      const queryParams: any = {};
      if (params.indices) queryParams.indices = params.indices;
      const response = await client.get(`/eth/v1/beacon/blob_sidecars/${params.blockId}`, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon blob sidecars:', error);
      throw error;
    }
  },

  async beaconGetBlock(params: BeaconBlockParams) {
    try {
      const client = createEthBeaconClient();
      const response = await client.get(`/eth/v2/beacon/blocks/${params.blockId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon block:', error);
      throw error;
    }
  },

  async beaconGetGenesis() {
    try {
      const client = createEthBeaconClient();
      const response = await client.get('/eth/v1/beacon/genesis');
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon genesis:', error);
      throw error;
    }
  },

  async beaconGetHeaders(params: BeaconHeadersParams) {
    try {
      const client = createEthBeaconClient();
      const queryParams: any = {};
      if (params.slot) queryParams.slot = params.slot;
      if (params.parentRoot) queryParams.parent_root = params.parentRoot;
      const response = await client.get('/eth/v1/beacon/headers', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon headers:', error);
      throw error;
    }
  },

  async beaconGetHeader(params: BeaconBlockParams) {
    try {
      const client = createEthBeaconClient();
      const response = await client.get(`/eth/v1/beacon/headers/${params.blockId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon header:', error);
      throw error;
    }
  },

  async beaconGetVoluntaryExits() {
    try {
      const client = createEthBeaconClient();
      const response = await client.get('/eth/v1/beacon/pool/voluntary_exits');
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon voluntary exits:', error);
      throw error;
    }
  },

  async beaconGetPoolAttestations() {
    try {
      const client = createEthBeaconClient();
      const response = await client.get('/eth/v2/beacon/pool/attestations');
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon pool attestations:', error);
      throw error;
    }
  },

  async beaconGetCommittees(params: BeaconCommitteesParams) {
    try {
      const { stateId, ...queryParams } = params;
      const client = createEthBeaconClient();
      const response = await client.get(`/eth/v1/beacon/states/${stateId}/committees`, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon committees:', error);
      throw error;
    }
  },

  async beaconGetFinalityCheckpoints(params: BeaconStateParams) {
    try {
      const client = createEthBeaconClient();
      const response = await client.get(`/eth/v1/beacon/states/${params.stateId}/finality_checkpoints`);
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon finality checkpoints:', error);
      throw error;
    }
  },

  async beaconGetFork(params: BeaconStateParams) {
    try {
      const client = createEthBeaconClient();
      const response = await client.get(`/eth/v1/beacon/states/${params.stateId}/fork`);
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon fork:', error);
      throw error;
    }
  },

  async beaconGetPendingConsolidations(params: BeaconStateParams) {
    try {
      const client = createEthBeaconClient();
      const response = await client.get(`/eth/v1/beacon/states/${params.stateId}/pending_consolidations`);
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon pending consolidations:', error);
      throw error;
    }
  },

  async beaconGetStateRoot(params: BeaconStateParams) {
    try {
      const client = createEthBeaconClient();
      const response = await client.get(`/eth/v1/beacon/states/${params.stateId}/root`);
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon state root:', error);
      throw error;
    }
  },

  async beaconGetSyncCommittees(params: BeaconSyncCommitteesParams) {
    try {
      const { stateId, ...queryParams } = params;
      const client = createEthBeaconClient();
      const response = await client.get(`/eth/v1/beacon/states/${stateId}/sync_committees`, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon sync committees:', error);
      throw error;
    }
  },

  async beaconGetRandao(params: BeaconRandaoParams) {
    try {
      const { stateId, epoch } = params;
      const client = createEthBeaconClient();
      const response = await client.get(`/eth/v1/beacon/states/${stateId}/randao`, { params: { epoch } });
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon RANDAO:', error);
      throw error;
    }
  },

  async beaconGetValidatorBalances(params: BeaconValidatorBalancesParams) {
    try {
      const { stateId, id } = params;
      const client = createEthBeaconClient();
      const queryParams: any = {};
      if (id) queryParams.id = id;
      const response = await client.get(`/eth/v1/beacon/states/${stateId}/validator_balances`, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon validator balances:', error);
      throw error;
    }
  },

  async beaconGetValidators(params: BeaconValidatorsParams) {
    try {
      const { stateId, id, status } = params;
      const client = createEthBeaconClient();
      const queryParams: any = {};
      if (id) queryParams.id = id;
      if (status) queryParams.status = status;
      const response = await client.get(`/eth/v1/beacon/states/${stateId}/validators`, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon validators:', error);
      throw error;
    }
  },

  async beaconGetValidator(params: BeaconValidatorParams) {
    try {
      const client = createEthBeaconClient();
      const response = await client.get(`/eth/v1/beacon/states/${params.stateId}/validators/${params.validatorId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon validator:', error);
      throw error;
    }
  },

  async beaconGetBlockRewards(params: BeaconBlockParams) {
    try {
      const client = createEthBeaconClient();
      const response = await client.get(`/eth/v1/beacon/rewards/blocks/${params.blockId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon block rewards:', error);
      throw error;
    }
  },

  async beaconGetBlindedBlock(params: BeaconBlockParams) {
    try {
      const client = createEthBeaconClient();
      const response = await client.get(`/eth/v1/beacon/blinded_blocks/${params.blockId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching beacon blinded block:', error);
      throw error;
    }
  },

  // ========================================
  // NEW: Aptos API (GET-based)
  // ========================================

  async aptosGetLedgerInfo() {
    try {
      const client = createAptosClient();
      const response = await client.get('/v1');
      return response.data;
    } catch (error) {
      console.error('Error fetching Aptos ledger info:', error);
      throw error;
    }
  },

  async aptosCheckHealth(params: AptosHealthParams) {
    try {
      const client = createAptosClient();
      const queryParams: any = {};
      if (params.durationSecs !== undefined) queryParams.duration_secs = params.durationSecs;
      const response = await client.get('/v1/-/healthy', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error checking Aptos health:', error);
      throw error;
    }
  },

  async aptosGetAccount(params: AptosAccountParams) {
    try {
      const client = createAptosClient();
      const queryParams: any = {};
      if (params.ledgerVersion) queryParams.ledger_version = params.ledgerVersion;
      const response = await client.get(`/v1/accounts/${params.address}`, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching Aptos account:', error);
      throw error;
    }
  },

  async aptosGetAccountResources(params: AptosAccountParams) {
    try {
      const client = createAptosClient();
      const queryParams: any = {};
      if (params.ledgerVersion) queryParams.ledger_version = params.ledgerVersion;
      const response = await client.get(`/v1/accounts/${params.address}/resources`, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching Aptos account resources:', error);
      throw error;
    }
  },

  async aptosGetAccountResource(params: AptosAccountResourceParams) {
    try {
      const client = createAptosClient();
      const queryParams: any = {};
      if (params.ledgerVersion) queryParams.ledger_version = params.ledgerVersion;
      const response = await client.get(`/v1/accounts/${params.address}/resource/${params.resourceType}`, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching Aptos account resource:', error);
      throw error;
    }
  },

  async aptosGetAccountModules(params: AptosAccountParams) {
    try {
      const client = createAptosClient();
      const queryParams: any = {};
      if (params.ledgerVersion) queryParams.ledger_version = params.ledgerVersion;
      const response = await client.get(`/v1/accounts/${params.address}/modules`, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching Aptos account modules:', error);
      throw error;
    }
  },

  async aptosGetAccountModule(params: AptosAccountModuleParams) {
    try {
      const client = createAptosClient();
      const queryParams: any = {};
      if (params.ledgerVersion) queryParams.ledger_version = params.ledgerVersion;
      const response = await client.get(`/v1/accounts/${params.address}/module/${params.moduleName}`, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching Aptos account module:', error);
      throw error;
    }
  },

  async aptosGetAccountTransactions(params: AptosAccountTransactionsParams) {
    try {
      const client = createAptosClient();
      const queryParams: any = {};
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.start) queryParams.start = params.start;
      const response = await client.get(`/v1/accounts/${params.address}/transactions`, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching Aptos account transactions:', error);
      throw error;
    }
  },

  async aptosGetEventsByCreationNumber(params: AptosEventsByCreationNumberParams) {
    try {
      const client = createAptosClient();
      const queryParams: any = {};
      if (params.start) queryParams.start = params.start;
      if (params.limit !== undefined) queryParams.limit = params.limit;
      const response = await client.get(`/v1/accounts/${params.address}/events/${params.creationNumber}`, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching Aptos events by creation number:', error);
      throw error;
    }
  },

  async aptosGetEventsByEventHandle(params: AptosEventsByEventHandleParams) {
    try {
      const client = createAptosClient();
      const queryParams: any = {};
      if (params.start) queryParams.start = params.start;
      if (params.limit !== undefined) queryParams.limit = params.limit;
      const response = await client.get(`/v1/accounts/${params.address}/events/${params.eventHandle}/${params.fieldName}`, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching Aptos events by event handle:', error);
      throw error;
    }
  },

  async aptosGetBlockByHeight(params: AptosBlockByHeightParams) {
    try {
      const client = createAptosClient();
      const queryParams: any = {};
      if (params.withTransactions !== undefined) queryParams.with_transactions = params.withTransactions;
      const response = await client.get(`/v1/blocks/by_height/${params.blockHeight}`, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching Aptos block by height:', error);
      throw error;
    }
  },

  async aptosGetBlockByVersion(params: AptosBlockByVersionParams) {
    try {
      const client = createAptosClient();
      const queryParams: any = {};
      if (params.withTransactions !== undefined) queryParams.with_transactions = params.withTransactions;
      const response = await client.get(`/v1/blocks/by_version/${params.version}`, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching Aptos block by version:', error);
      throw error;
    }
  },

  async aptosGetTransactions(params: AptosTransactionsParams) {
    try {
      const client = createAptosClient();
      const queryParams: any = {};
      if (params.start) queryParams.start = params.start;
      if (params.limit !== undefined) queryParams.limit = params.limit;
      const response = await client.get('/v1/transactions', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching Aptos transactions:', error);
      throw error;
    }
  },

  async aptosGetTransactionByHash(params: AptosTransactionByHashParams) {
    try {
      const client = createAptosClient();
      const response = await client.get(`/v1/transactions/by_hash/${params.txnHash}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Aptos transaction by hash:', error);
      throw error;
    }
  },

  async aptosEstimateGasPrice() {
    try {
      const client = createAptosClient();
      const response = await client.get('/v1/estimate_gas_price');
      return response.data;
    } catch (error) {
      console.error('Error estimating Aptos gas price:', error);
      throw error;
    }
  },

  // ========================================
  // NEW: Notify (Webhooks) API (GET-based)
  // ========================================

  async getWebhooks() {
    try {
      const client = createNotifyClient();
      const response = await client.get('/team-webhooks');
      return response.data;
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      throw error;
    }
  },

  async getWebhookAddresses(params: GetWebhookAddressesParams) {
    try {
      const client = createNotifyClient();
      const queryParams: any = { webhook_id: params.webhookId };
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.after) queryParams.after = params.after;
      const response = await client.get('/webhook-addresses', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching webhook addresses:', error);
      throw error;
    }
  },

  async getWebhookNftFilters(params: GetWebhookNftFiltersParams) {
    try {
      const client = createNotifyClient();
      const queryParams: any = { webhook_id: params.webhookId };
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.after) queryParams.after = params.after;
      const response = await client.get('/webhook-nft-filters', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching webhook NFT filters:', error);
      throw error;
    }
  },

  async getWebhookVariable(params: GetWebhookVariableParams) {
    try {
      const client = createNotifyClient();
      const queryParams: any = {};
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.after) queryParams.after = params.after;
      const response = await client.get(`/graphql/variables/${params.variable}`, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching webhook variable:', error);
      throw error;
    }
  },

  // ========================================
  // NEW: Admin (Gas Manager) API (GET-based)
  // ========================================

  async getGasManagerPolicy(params: GetGasManagerPolicyParams) {
    try {
      const client = createAdminClient();
      const response = await client.get(`/api/gasManager/policy/${params.id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching gas manager policy:', error);
      throw error;
    }
  },

  async getGasManagerPolicies(params: GetGasManagerPoliciesParams) {
    try {
      const client = createAdminClient();
      const queryParams: any = {};
      if (params.appId) queryParams.appId = params.appId;
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.before) queryParams.before = params.before;
      if (params.after) queryParams.after = params.after;
      const response = await client.get('/api/gasManager/policies', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching gas manager policies:', error);
      throw error;
    }
  },

  async getGasManagerPolicyStats(params: GetGasManagerPolicyParams) {
    try {
      const client = createAdminClient();
      const response = await client.get(`/api/gasManager/policy/${params.id}/stats/details`);
      return response.data;
    } catch (error) {
      console.error('Error fetching gas manager policy stats:', error);
      throw error;
    }
  },

  async getGasManagerSponsorships(params: GetGasManagerPolicySponsorshipsParams) {
    try {
      const client = createAdminClient();
      const queryParams: any = {};
      if (params.limit !== undefined) queryParams.limit = params.limit;
      const response = await client.get(`/api/gasManager/policy/${params.id}/sponsorships`, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching gas manager sponsorships:', error);
      throw error;
    }
  },
};
