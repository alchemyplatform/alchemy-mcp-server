export function convertTimestampToDate(unixTimestamp: number) {
    const date = new Date(unixTimestamp);
    const humanReadableDate = date.toLocaleString();
  
    return humanReadableDate;
}

