import { ContainerModule } from 'inversify';
import axios from 'axios';
import dotenv from 'dotenv';
import { DI_SYMBOLS } from '../di-symbols.js';
import { JsonRpcClientProvider } from '../../api/client-providers.js';
import { AlchemyApi } from '../../api/alchemyApi.js';

dotenv.config();

const API_KEY = process.env.ALCHEMY_API_KEY || '';
const BREADCRUMB_HEADER = "alchemy-mcp";

export class ClientsModule extends ContainerModule {
  constructor() {
    super(({ bind }) => {
      // Environment values
      bind(DI_SYMBOLS.AlchemyApiKey).toConstantValue(API_KEY);
      bind(DI_SYMBOLS.AgentWalletServer).toConstantValue(process.env.AGENT_WALLET_SERVER || '');

      // Parameterless singleton clients
      bind(DI_SYMBOLS.PricesClient).toConstantValue(axios.create({
        baseURL: `https://api.g.alchemy.com/prices/v1/${API_KEY}/tokens`,
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-alchemy-client-breadcrumb': BREADCRUMB_HEADER,
        },
      }));

      bind(DI_SYMBOLS.MultiChainTokenClient).toConstantValue(axios.create({
        baseURL: `https://api.g.alchemy.com/data/v1/${API_KEY}/assets/tokens`,
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-alchemy-client-breadcrumb': BREADCRUMB_HEADER,
        },
      }));

      bind(DI_SYMBOLS.MultiChainTransactionHistoryClient).toConstantValue(axios.create({
        baseURL: `https://api.g.alchemy.com/data/v1/${API_KEY}/transactions/history`,
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-alchemy-client-breadcrumb': BREADCRUMB_HEADER,
        },
      }));

      bind(DI_SYMBOLS.NftClient).toConstantValue(axios.create({
        baseURL: `https://api.g.alchemy.com/data/v1/${API_KEY}/assets/nfts`,
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-alchemy-client-breadcrumb': BREADCRUMB_HEADER,
        },
      }));

      const walletClient = axios.create({
        baseURL: `https://api.g.alchemy.com/v2/${API_KEY}`,
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
        },
      });
      walletClient.interceptors.request.use((config) => {
        if (config.method === 'post') {
          if (config.data && config.data.method) {
            config.data = {
              id: 1,
              jsonrpc: "2.0",
              method: config.data.method,
              params: config.data.params,
            };
          }
        }
        return config;
      });
      bind(DI_SYMBOLS.WalletClient).toConstantValue(walletClient);

      // Network-parameterized client provider
      bind(JsonRpcClientProvider).toSelf().inSingletonScope();

      // API service
      bind(AlchemyApi).toSelf().inSingletonScope();
    });
  }
}
