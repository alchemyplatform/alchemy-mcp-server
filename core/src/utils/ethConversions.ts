export function convertWeiToEth(wei: string) {
    const eth = BigInt(wei) / BigInt(10 ** 18);
    return eth.toString();
}

export function convertEthToWei(eth: string) {
    const wei = BigInt(Math.floor(parseFloat(eth) * (10 ** 18)));
    return wei;
}

