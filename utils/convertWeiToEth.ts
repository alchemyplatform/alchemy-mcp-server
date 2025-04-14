export function convertWeiToEth(wei: string) {
    const eth = BigInt(wei) / BigInt(10 ** 18);
    return eth.toString();
}