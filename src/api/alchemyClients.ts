import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_KEY = process.env.ALCHEMY_API_KEY;

// const BASE_API_URLS = {
//     NFT: `https://${NFT_DEFAULT_NETWORK}.g.alchemy.com/nft/v3/${API_KEY}`,
//     PRICES: `https://api.g.alchemy.com/prices/v1/tokens`,
//     TOKEN: `https://api.g.alchemy.com/data/v1/${API_KEY}/assets/tokens/by-address`,
//     TXN_HISTORY: `https://api.g.alchemy.com/data/v1/${API_KEY}/transactions/history/by-address`
//   }

export const pricesClient = axios.create({
    baseURL: 'https://api.g.alchemy.com/prices/v1/tokens',
    headers: {
      'accept': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
  });

  // TODO: Add network param to the baseURL
export const nftClient = axios.create({
    baseURL: `https://eth-mainnet.g.alchemy.com/nft/v3/${API_KEY}`,
    headers: {
      'accept': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
  });