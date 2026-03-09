import { SiweMessage } from 'siwe';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createKeyPairSignerFromBytes, createKeyPairSignerFromPrivateKeyBytes } from '@solana/kit';
import { wrapFetchWithPaymentFromConfig } from '@x402/fetch';
import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm';
import { ExactSvmScheme, toClientSvmSigner } from '@x402/svm';

const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
const X402_GATEWAY_URL = process.env.X402_GATEWAY_URL || 'https://x402.alchemy.com';
const BREADCRUMB_HEADER = 'alchemy-mcp';

type KeyType = 'evm' | 'solana';

function detectKeyType(key: string): KeyType {
  const trimmed = key.trim();
  if (trimmed.startsWith('0x')) return 'evm';
  return 'solana';
}

// --- EVM helpers ---

function getEvmAccount() {
  return privateKeyToAccount(WALLET_PRIVATE_KEY as `0x${string}`);
}

// Token lifetime: 1 hour, refresh at 50 minutes
const TOKEN_LIFETIME_MS = 60 * 60 * 1000;
const TOKEN_REFRESH_MS = 50 * 60 * 1000;

let cachedSiweToken: string | null = null;
let tokenIssuedAt: number = 0;

async function getSiweAuthHeader(): Promise<string | null> {
  if (!WALLET_PRIVATE_KEY || detectKeyType(WALLET_PRIVATE_KEY) !== 'evm') {
    return null;
  }

  const now = Date.now();
  if (cachedSiweToken && (now - tokenIssuedAt) < TOKEN_REFRESH_MS) {
    return cachedSiweToken;
  }

  const account = getEvmAccount();
  const expirationTime = new Date(now + TOKEN_LIFETIME_MS).toISOString();

  const message = new SiweMessage({
    domain: new URL(X402_GATEWAY_URL).host,
    address: account.address,
    statement: 'Sign in to Alchemy x402 Gateway',
    uri: X402_GATEWAY_URL,
    version: '1',
    chainId: 1,
    expirationTime,
  });

  const messageToSign = message.prepareMessage();
  const signature = await account.signMessage({ message: messageToSign });

  const token = Buffer.from(JSON.stringify({ message: messageToSign, signature })).toString('base64');

  cachedSiweToken = `SIWE ${token}`;
  tokenIssuedAt = now;

  return cachedSiweToken;
}

// --- Solana helpers ---

async function getSolanaSigner(key: string) {
  const trimmed = key.trim();

  if (trimmed.startsWith('[')) {
    const bytes = new Uint8Array(JSON.parse(trimmed));
    if (bytes.length === 64) {
      return await createKeyPairSignerFromBytes(bytes);
    } else if (bytes.length === 32) {
      return await createKeyPairSignerFromPrivateKeyBytes(bytes);
    }
    throw new Error(`Invalid Solana key length: expected 32 or 64 bytes, got ${bytes.length}`);
  }

  const decoded = decodeBase58(trimmed);
  if (decoded.length === 64) {
    return await createKeyPairSignerFromBytes(decoded);
  } else if (decoded.length === 32) {
    return await createKeyPairSignerFromPrivateKeyBytes(decoded);
  }
  throw new Error(`Invalid Solana key length after base58 decode: expected 32 or 64 bytes, got ${decoded.length}`);
}

function decodeBase58(input: string): Uint8Array {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const BASE = 58;

  const bytes: number[] = [0];
  for (const char of input) {
    const value = ALPHABET.indexOf(char);
    if (value === -1) throw new Error(`Invalid base58 character: ${char}`);
    let carry = value;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * BASE;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  for (const char of input) {
    if (char !== '1') break;
    bytes.push(0);
  }

  return new Uint8Array(bytes.reverse());
}

// --- x402-wrapped fetch ---

let x402FetchInstance: typeof fetch | null = null;
let x402FetchInitPromise: Promise<typeof fetch> | null = null;

async function initX402Fetch(): Promise<typeof fetch> {
  const schemes: Array<{ network: string; client: any }> = [];

  if (WALLET_PRIVATE_KEY) {
    const keyType = detectKeyType(WALLET_PRIVATE_KEY);

    if (keyType === 'evm') {
      const account = getEvmAccount();
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      });
      const evmSigner = toClientEvmSigner(account, publicClient);
      schemes.push({
        network: 'eip155:*',
        client: new ExactEvmScheme(evmSigner),
      });
    } else {
      const solanaSigner = await getSolanaSigner(WALLET_PRIVATE_KEY);
      const svmSigner = toClientSvmSigner(solanaSigner);
      schemes.push({
        network: 'solana:*',
        client: new ExactSvmScheme(svmSigner),
      });
    }
  }

  return wrapFetchWithPaymentFromConfig(fetch, { schemes });
}

async function getX402Fetch(): Promise<typeof fetch> {
  if (x402FetchInstance) return x402FetchInstance;

  if (!x402FetchInitPromise) {
    x402FetchInitPromise = initX402Fetch();
  }

  x402FetchInstance = await x402FetchInitPromise;
  return x402FetchInstance;
}

// --- Axios-compatible client ---

interface AxiosLikeResponse {
  data: any;
  status: number;
}

interface AxiosLikeClient {
  get(url: string): Promise<AxiosLikeResponse>;
  post(url: string, data?: any): Promise<AxiosLikeResponse>;
  interceptors: {
    request: { use: (fn: (config: any) => any) => void };
  };
}

function createAxiosLikeClient(baseURL: string): AxiosLikeClient {
  let requestInterceptor: ((config: any) => any) | null = null;

  const makeRequest = async (method: string, url: string, data?: any): Promise<AxiosLikeResponse> => {
    const fullUrl = `${baseURL}${url}`;

    let requestData = data;
    if (requestInterceptor) {
      const config = { method, data: requestData };
      const modified = requestInterceptor(config);
      requestData = modified.data;
    }

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'content-type': 'application/json',
      'x-alchemy-client-breadcrumb': BREADCRUMB_HEADER,
    };

    const authHeader = await getSiweAuthHeader();
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const fetchFn = await getX402Fetch();
    const response = await fetchFn(fullUrl, {
      method: method.toUpperCase(),
      headers,
      ...(requestData !== undefined ? { body: JSON.stringify(requestData) } : {}),
    });

    const responseData = await response.json();
    return { data: responseData, status: response.status };
  };

  return {
    get: (url: string) => makeRequest('get', url),
    post: (url: string, data?: any) => makeRequest('post', url, data),
    interceptors: {
      request: {
        use: (fn: (config: any) => any) => { requestInterceptor = fn; }
      }
    }
  };
}

// --- Client factories ---

export const createX402PricesClient = () =>
  createAxiosLikeClient(`${X402_GATEWAY_URL}/prices/v1/tokens`);

export const createX402MultiChainTokenClient = () =>
  createAxiosLikeClient(`${X402_GATEWAY_URL}/data/v1/assets/tokens`);

export const createX402MultiChainTransactionHistoryClient = () =>
  createAxiosLikeClient(`${X402_GATEWAY_URL}/data/v1/transactions/history`);

export const createX402JsonRpcClient = (network: string) => {
  const client = createAxiosLikeClient(`${X402_GATEWAY_URL}/${network}/v2`);

  client.interceptors.request.use((config: any) => {
    if (config.method === 'post') {
      config.data = {
        id: 1,
        jsonrpc: '2.0',
        ...config.data,
      };
    }
    return config;
  });

  return client;
};

export const createX402NftClient = () =>
  createAxiosLikeClient(`${X402_GATEWAY_URL}/data/v1/assets/nfts`);

// --- Account status ---

export async function getX402AccountStatus(): Promise<{
  walletAddress: string;
  keyType: KeyType;
  status: 'active' | 'payment_required';
  paymentRequirements?: any;
}> {
  if (!WALLET_PRIVATE_KEY) {
    throw new Error('WALLET_PRIVATE_KEY is not set');
  }

  const keyType = detectKeyType(WALLET_PRIVATE_KEY);

  let walletAddress: string;
  if (keyType === 'evm') {
    walletAddress = getEvmAccount().address;
  } else {
    const signer = await getSolanaSigner(WALLET_PRIVATE_KEY);
    walletAddress = signer.address;
  }

  // Probe the gateway
  const headers: Record<string, string> = {
    'accept': 'application/json',
    'content-type': 'application/json',
    'x-alchemy-client-breadcrumb': BREADCRUMB_HEADER,
  };

  const authHeader = await getSiweAuthHeader();
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  const url = `${X402_GATEWAY_URL}/eth-mainnet/v2`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
    }),
  });

  if (response.status === 402) {
    let paymentRequirements;
    try {
      paymentRequirements = await response.json();
    } catch {
      // Response may not be JSON
    }
    return {
      walletAddress,
      keyType,
      status: 'payment_required',
      paymentRequirements,
    };
  }

  return {
    walletAddress,
    keyType,
    status: 'active',
  };
}

export function isX402Mode(): boolean {
  return !!process.env.WALLET_PRIVATE_KEY;
}
