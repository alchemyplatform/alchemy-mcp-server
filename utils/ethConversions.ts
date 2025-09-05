export function convertWeiToEth(wei: string) {
    const eth = BigInt(wei) / BigInt(10 ** 18);
    return eth.toString();
}

export function convertEthToWei(eth: string) {
    const wei = BigInt(Math.floor(parseFloat(eth) * (10 ** 18)));
    return wei;
}

export function convertWeiToGwei(wei: string) {
    // Remove 0x prefix if present
    const cleanWei = wei.startsWith('0x') ? wei.slice(2) : wei;
    const weiValue = BigInt('0x' + cleanWei);
    const gwei = Number(weiValue) / (10 ** 9);
    return gwei;
}
