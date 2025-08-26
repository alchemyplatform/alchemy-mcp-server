import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the root directory path (where .env should be located)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../../../'); // packages/config/src -> root

// Load environment variables from .env file in the root directory
dotenv.config({ path: resolve(rootDir, '.env') });

// Export individual environment variables
export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
export const AGENT_WALLET_SERVER = process.env.AGENT_WALLET_SERVER;
export const SERVER_VERSION = process.env.SERVER_VERSION;
export const PORT = process.env.PORT || '3001';
export const HOST = process.env.HOST || '127.0.0.1';

// Validate required environment variables
export function validateRequiredEnvVars() {
  const errors: string[] = [];
  
  if (!ALCHEMY_API_KEY) {
    errors.push('ALCHEMY_API_KEY is required');
  }
  
  // Note: AGENT_WALLET_SERVER is optional but required for wallet operations
  if (!AGENT_WALLET_SERVER) {
    console.warn('⚠️  AGENT_WALLET_SERVER is not set. Wallet operations (sendTransaction, swap) will not function.');
  }
  
  if (errors.length > 0) {
    throw new Error(`Missing required environment variables:\n${errors.join('\n')}`);
  }
}
