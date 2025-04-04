export default function convertHexBalanceToDecimal(response: any) {
    // Handle nested data structure - API returns { data: { data: { tokens: [...] } } }
    const responseData = response.data && response.data.data ? response.data.data : response.data;
        
    // Process tokens if they exist
    // LLMs are very bad at arithmetic, so we need to convert the hex balances to decimal
    if (responseData.tokens && Array.isArray(responseData.tokens)) {
      // Convert hex balances to decimal
      responseData.tokens = responseData.tokens.map((token: any) => {
        try {
          const processedToken = { ...token };
          const hexTokenBalance = token.tokenBalance;
          const tokenDecimals = parseInt(token.tokenMetadata.decimals || '18', 10);
          
          const bigIntBalance = BigInt(hexTokenBalance);
          const decimalBalance = Number(bigIntBalance) / Math.pow(10, tokenDecimals);
          
          // Store both formats
          processedToken.originalHexBalance = hexTokenBalance;
          processedToken.tokenBalance = decimalBalance;
          
          return processedToken;
        } catch (error) {
          // On error, return token with balance as 0 but keep original hex
          return {
            ...token,
            originalHexBalance: token.tokenBalance,
            tokenBalance: 0
          };
        }
      });
    }
  
    return responseData;
  }