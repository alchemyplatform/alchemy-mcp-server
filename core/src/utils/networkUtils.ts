export const getChainIdForNetwork = (network: string): string => {
  const chainIds: Record<string, string> = {
    'mainnet': '1',
    'sepolia': '11155111'
  };
  return chainIds[network] || '11155111'; // Default to Sepolia
};

export const normalizeNetworkName = (network: string): string => {
  // Map user-friendly network names to Alchemy API format for Ethereum networks
  const networkMappings: Record<string, string> = {
    'mainnet': 'eth-mainnet',
    'ethereum': 'eth-mainnet', 
    'eth-mainnet': 'eth-mainnet', // Already correct
    'sepolia': 'eth-sepolia',
    'eth-sepolia': 'eth-sepolia', // Already correct
  };
  
  return networkMappings[network.toLowerCase()] || network;
};
