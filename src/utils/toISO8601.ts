// Helper function to convert date strings to ISO 8601 format
export function toISO8601(dateStr: string): string {
    // Handle keywords first
    const normalizedStr = dateStr.toLowerCase();
    
    const now = new Date();
    
    switch (normalizedStr) {
        case 'today': {
            const date = new Date(now);
            date.setHours(0, 0, 0, 0);
            return date.toISOString();
        }
        case 'yesterday': {
            const date = new Date(now);
            date.setDate(date.getDate() - 1);
            date.setHours(0, 0, 0, 0);
            return date.toISOString();
        }
        case 'last-week': {
            const date = new Date(now);
            date.setDate(date.getDate() - 7);
            date.setHours(0, 0, 0, 0);
            return date.toISOString();
        }
        case 'last-month': {
            const date = new Date(now);
            date.setMonth(date.getMonth() - 1);
            date.setHours(0, 0, 0, 0);
            return date.toISOString();
        }
        case 'start-of-year': {
            const date = new Date(now);
            date.setMonth(0, 1);
            date.setHours(0, 0, 0, 0);
            return date.toISOString();
        }
        case 'now': {
            return now.toISOString();
        }
    }
    
    // If already in ISO format, return as is
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/)) {
        return dateStr;
    }
  
    // For any other date string, parse it normally
    try {
        const date = new Date(dateStr);
        return date.toISOString();
    } catch (error) {
        console.error('Error parsing date:', error);
        // Return current time if parsing fails
        return now.toISOString();
    }
}

export default toISO8601;