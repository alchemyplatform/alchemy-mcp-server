export const getChainIdForNetwork = (network: string): string => {
  const chainIds: Record<string, string> = {
    'mainnet': '1',
    'sepolia': '11155111'
  };
  return chainIds[network] || '11155111'; // Default to Sepolia
};
