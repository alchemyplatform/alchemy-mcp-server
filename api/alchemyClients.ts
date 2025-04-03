import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_KEY = process.env.ALCHEMY_API_KEY;

export const pricesClient = axios.create({
    baseURL: 'https://api.g.alchemy.com/prices/v1/tokens',
    headers: {
      'accept': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
  });
  
export const multiChainTokenClient = axios.create({
    baseURL: `https://api.g.alchemy.com/data/v1/${API_KEY}/assets/tokens`,
    headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
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