import type { AxiosInstance } from 'axios';
import { symbolFor } from './di-container.js';

export const DI_SYMBOLS = {
  AlchemyApiKey: symbolFor<string>("AlchemyApiKey"),
  AgentWalletServer: symbolFor<string>("AgentWalletServer"),
  PricesClient: symbolFor<AxiosInstance>("PricesClient"),
  MultiChainTokenClient: symbolFor<AxiosInstance>("MultiChainTokenClient"),
  MultiChainTransactionHistoryClient: symbolFor<AxiosInstance>("MultiChainTransactionHistoryClient"),
  NftClient: symbolFor<AxiosInstance>("NftClient"),
  WalletClient: symbolFor<AxiosInstance>("WalletClient"),
};
