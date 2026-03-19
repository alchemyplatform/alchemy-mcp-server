import axios, { type AxiosInstance } from "axios";
import { inject, injectable } from "inversify";

import { DI_SYMBOLS } from "../di/di-symbols.js";

const BREADCRUMB_HEADER = "alchemy-mcp";

@injectable()
abstract class NetworkClientProvider {
  private cache = new Map<string, AxiosInstance>();

  constructor(@inject(DI_SYMBOLS.AlchemyApiKey) protected apiKey: string) {}

  protected abstract createClient(network: string): AxiosInstance;

  get(network = "eth-mainnet"): AxiosInstance {
    if (!this.cache.has(network)) {
      this.cache.set(network, this.createClient(network));
    }
    return this.cache.get(network)!;
  }
}

@injectable()
export class JsonRpcClientProvider extends NetworkClientProvider {
  protected createClient(network: string): AxiosInstance {
    const client = axios.create({
      baseURL: `https://${network}.g.alchemy.com/v2/${this.apiKey}`,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "x-alchemy-client-breadcrumb": BREADCRUMB_HEADER,
      },
    });
    client.interceptors.request.use((config) => {
      if (config.method === "post") {
        config.data = { id: 1, jsonrpc: "2.0", ...config.data };
      }
      return config;
    });
    return client;
  }
}

@injectable()
export class NftV3ClientProvider extends NetworkClientProvider {
  protected createClient(network: string): AxiosInstance {
    return axios.create({
      baseURL: `https://${network}.g.alchemy.com/nft/v3/${this.apiKey}`,
      headers: {
        accept: "application/json",
        "x-alchemy-client-breadcrumb": BREADCRUMB_HEADER,
      },
    });
  }
}

@injectable()
export class BeaconClientProvider extends NetworkClientProvider {
  protected createClient(network: string): AxiosInstance {
    return axios.create({
      baseURL: `https://${network}beacon.g.alchemy.com/v2/${this.apiKey}`,
      headers: {
        accept: "application/json",
        "x-alchemy-client-breadcrumb": BREADCRUMB_HEADER,
      },
    });
  }
}
