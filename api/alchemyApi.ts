import type { AxiosInstance } from "axios";
import { inject, injectable } from "inversify";

import { DI_SYMBOLS } from "../di/di-symbols.js";
import {
  AddressPair,
  AssetTransfersParams,
  MultiChainTokenByAddress,
  MultiChainTransactionHistoryByAddress,
  NftContractsByAddressParams,
  NftsByAddressParams,
  SendTransactionParams,
  SwapParams,
  TokenPriceByAddress,
  TokenPriceByAddressPair,
  TokenPriceBySymbol,
  TokenPriceHistoryBySymbol,
} from "../types/types.js";
import convertHexBalanceToDecimal from "../utils/convertHexBalanceToDecimal.js";
import { JsonRpcClientProvider } from "./client-providers.js";

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
      const { addresses, ...otherParams } = params;

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
}
