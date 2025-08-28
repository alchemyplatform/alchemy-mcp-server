import { AGENT_WALLET_SERVER } from '@alchemy/mcp-config';
import { 
  createPricesClient, 
  createMultiChainTokenClient, 
  createMultiChainTransactionHistoryClient, 
  createAlchemyJsonRpcClient, 
  createNftClient,
  createEtherscanClient
} from './alchemyClients.js';
import { TokenPriceBySymbol, TokenPriceByAddress, TokenPriceByAddressPair, TokenPriceHistoryBySymbol, MultiChainTokenByAddress, MultiChainTransactionHistoryByAddress, AssetTransfersParams, NftsByAddressParams, NftContractsByAddressParams, AddressPair, SendTransactionParams, SwapParams, EtherscanContractAbiParams } from '../types/types.js';
import convertHexBalanceToDecimal from '../utils/convertHexBalanceToDecimal.js';
import { getChainIdForNetwork } from '../utils/networkUtils.js';

export const alchemyApi = {
  
  async getTokenPriceBySymbol(params: TokenPriceBySymbol, apiKey?: string) {
    try {
      const client = createPricesClient(apiKey);
      
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
  
  async getTokenPriceByAddress(params: TokenPriceByAddress, apiKey?: string) {
    try {
      const client = createPricesClient(apiKey);
      
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
  
  async getTokenPriceHistoryBySymbol(params: TokenPriceHistoryBySymbol, apiKey?: string) {
    console.log('Fetching token price history for symbol:', params.symbol);
    try {
      const client = createPricesClient(apiKey);
      
      const response = await client.post('/historical', {
        ...params
      });

      console.log('Successfully fetched token price history:', response.data);
      return response.data;  
    } catch (error) {
      console.error('Error fetching token price history:', error);
      throw error;
    }
  },
  
  async getTokensByMultichainAddress(params: MultiChainTokenByAddress, apiKey?: string) {
    try {
      const client = createMultiChainTokenClient(apiKey);
      
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
  
  async getTransactionHistoryByMultichainAddress(params: MultiChainTransactionHistoryByAddress, apiKey?: string) {
    try {
      const { addresses, ...otherParams } = params;
      const client = createMultiChainTransactionHistoryClient(apiKey);
      
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

  async getAssetTransfers(params: AssetTransfersParams, apiKey?: string) {
    const { network, ...otherParams } = params;
    try {
      const client = createAlchemyJsonRpcClient(apiKey, network);
      
      const response = await client.post('', {
        method: "alchemy_getAssetTransfers",
        params: [{
          ...otherParams
        }]
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching asset transfers:', error);
      throw error;
    }
  },

  async getNftsForAddress(params: NftsByAddressParams, apiKey?: string) {
    try {
      const client = createNftClient(apiKey);
      
      const response = await client.post('/by-address', { 
        ...params
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching NFTs for address:', error);
      throw error;
    }
  },

  async getNftContractsByAddress(params: NftContractsByAddressParams, apiKey?: string) {
    try {
      const client = createNftClient(apiKey);
      
      const response = await client.post('/by-address', {
        ...params
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching NFT contracts by address:', error);
      throw error;
    }
  },

  async sendTransaction(params: SendTransactionParams) {
    const { ownerScaAccountAddress, signerAddress, toAddress, value, callData } = params;
    try {
      const response = await fetch(`${AGENT_WALLET_SERVER}/transactions/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerScaAccountAddress,
          signerAddress,
          toAddress,
          value,
          callData
        })
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerScaAccountAddress,
          signerAddress
        })
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

  async getContractAbi(params: EtherscanContractAbiParams, apiKey?: string) {
    try {
      const client = createEtherscanClient(apiKey);
      const chainId = getChainIdForNetwork(params.network);
      
      const response = await client.get('', {
        params: {
          chainid: chainId,
          module: 'contract',
          action: 'getabi',
          address: params.contractAddress
          // apikey is automatically included by the client
        }
      });

      console.error('Etherscan API response:', response);

      if (response.data.status === '0') {
        throw new Error(`Etherscan API error: ${response.data.message || response.data.result}`);
      }

      // Parse ABI if it's a string
      let abi = response.data.result;
      if (typeof abi === 'string') {
        try {
          abi = JSON.parse(abi);
        } catch (parseError) {
          throw new Error('Failed to parse contract ABI');
        }
      }

      return {
        contractAddress: params.contractAddress,
        network: params.network,
        chainId: chainId,
        abi: abi,
        status: response.data.status,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error fetching contract ABI:', error);
      throw error;
    }
  }
};


