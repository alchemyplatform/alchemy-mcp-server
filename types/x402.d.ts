declare module '@x402/fetch' {
  export function wrapFetchWithPaymentFromConfig(
    fetchFn: typeof fetch,
    config: {
      schemes: Array<{
        network: string;
        client: any;
        x402Version?: 1 | 2;
      }>;
      paymentRequirementsSelector?: any;
    }
  ): typeof fetch;
}

declare module '@x402/evm' {
  export class ExactEvmScheme {
    constructor(signer: any);
  }

  export function toClientEvmSigner(
    signer: any,
    publicClient?: any
  ): any;
}

declare module '@x402/svm' {
  export class ExactSvmScheme {
    constructor(signer: any, config?: { rpcUrl?: string });
  }

  export function toClientSvmSigner(signer: any): any;
}
