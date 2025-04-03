import { alchemyApi } from './alchemyApi.js';

const testAddress = '0x3825a396dedd74a2714a7603f039ed109dfc77e4';

async function testProcessedTokens() {
  try {
    console.log('Testing getProcessedTokensByMultichainAddress...');
    const result = await alchemyApi.getProcessedTokensByMultichainAddress({
      addresses: [
        {
          address: testAddress,
          networks: ['eth-mainnet']
        }
      ]
    });
    
    // If tokens exist, print the first 3 token balances to verify conversion
    if (result.tokens && result.tokens.length > 0) {
      console.log(`Found ${result.tokens.length} tokens for address ${testAddress}`);
      
      // Print first 3 tokens as examples
      for (let i = 0; i < Math.min(3, result.tokens.length); i++) {
        const token = result.tokens[i];
        console.log(`Token: ${token.tokenMetadata.symbol || 'Unknown'}`);
        console.log(`  Original Hex Balance: ${token.originalHexBalance}`);
        console.log(`  Converted Balance: ${token.tokenBalance}`);
        console.log(`  Decimals: ${token.tokenMetadata.decimals}`);
        console.log('---');
      }
    } else {
      console.log('No tokens found in response');
    }
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testProcessedTokens(); 