import axios, { type AxiosInstance } from "axios";
import { inject, injectable } from "inversify";

import { DI_SYMBOLS } from "../di/di-symbols.js";

const BREADCRUMB_HEADER = "alchemy-mcp";

@injectable()
export class JsonRpcClientProvider {
  private cache = new Map<string, AxiosInstance>();

  constructor(@inject(DI_SYMBOLS.AlchemyApiKey) private apiKey: string) {}

  get(network = "eth-mainnet"): AxiosInstance {
    if (!this.cache.has(network)) {
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
      this.cache.set(network, client);
    }
    return this.cache.get(network)!;
  }
}

@injectable()
export class NftV3ClientProvider {
  private cache = new Map<string, AxiosInstance>();

  constructor(@inject(DI_SYMBOLS.AlchemyApiKey) private apiKey: string) {}

  get(network = "eth-mainnet"): AxiosInstance {
    if (!this.cache.has(network)) {
      const client = axios.create({
        baseURL: `https://${network}.g.alchemy.com/nft/v3/${this.apiKey}`,
        headers: {
          accept: "application/json",
          "x-alchemy-client-breadcrumb": BREADCRUMB_HEADER,
        },
      });
      this.cache.set(network, client);
    }
    return this.cache.get(network)!;
  }
}

@injectable()
export class BeaconClientProvider {
  private cache = new Map<string, AxiosInstance>();

  constructor(@inject(DI_SYMBOLS.AlchemyApiKey) private apiKey: string) {}

  get(network = "eth-mainnet"): AxiosInstance {
    if (!this.cache.has(network)) {
      const client = axios.create({
        baseURL: `https://${network}beacon.g.alchemy.com/v2/${this.apiKey}`,
        headers: {
          accept: "application/json",
          "x-alchemy-client-breadcrumb": BREADCRUMB_HEADER,
        },
      });
      this.cache.set(network, client);
    }
    return this.cache.get(network)!;
  }
}
