import axios from "axios";
import { ContainerModule } from "inversify";

import { AlchemyApi } from "../../api/alchemyApi.js";
import {
  BeaconClientProvider,
  JsonRpcClientProvider,
  NftV3ClientProvider,
} from "../../api/client-providers.js";
import { DI_SYMBOLS } from "../di-symbols.js";

const BREADCRUMB_HEADER = "alchemy-mcp";

export class ClientsModule extends ContainerModule {
  constructor() {
    super(({ bind }) => {
      const apiKey = process.env.ALCHEMY_API_KEY || "";

      // Environment values
      bind(DI_SYMBOLS.AlchemyApiKey).toConstantValue(apiKey);
      bind(DI_SYMBOLS.AgentWalletServer).toConstantValue(
        process.env.AGENT_WALLET_SERVER || "",
      );

      // Parameterless singleton clients
      bind(DI_SYMBOLS.PricesClient).toConstantValue(
        axios.create({
          baseURL: `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens`,
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            "x-alchemy-client-breadcrumb": BREADCRUMB_HEADER,
          },
        }),
      );

      bind(DI_SYMBOLS.MultiChainTokenClient).toConstantValue(
        axios.create({
          baseURL: `https://api.g.alchemy.com/data/v1/${apiKey}/assets/tokens`,
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            "x-alchemy-client-breadcrumb": BREADCRUMB_HEADER,
          },
        }),
      );

      bind(DI_SYMBOLS.MultiChainTransactionHistoryClient).toConstantValue(
        axios.create({
          baseURL: `https://api.g.alchemy.com/data/v1/${apiKey}/transactions/history`,
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            "x-alchemy-client-breadcrumb": BREADCRUMB_HEADER,
          },
        }),
      );

      bind(DI_SYMBOLS.NftClient).toConstantValue(
        axios.create({
          baseURL: `https://api.g.alchemy.com/data/v1/${apiKey}/assets/nfts`,
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            "x-alchemy-client-breadcrumb": BREADCRUMB_HEADER,
          },
        }),
      );

      // Network-parameterized client providers
      bind(JsonRpcClientProvider).toSelf().inSingletonScope();
      bind(NftV3ClientProvider).toSelf().inSingletonScope();
      bind(BeaconClientProvider).toSelf().inSingletonScope();

      // API service
      bind(AlchemyApi).toSelf().inSingletonScope();
    });
  }
}
