import { DateRange } from "../types/types.js";

/**
 * Calculates date range based on a time frame string
 * @param timeFrame Various time frame formats like "last-week", "past-7d", "previous-calendar-week", "ytd", etc.
 * @returns Object with startDate and endDate in ISO 8601 format
 */
export function calculateDateRange(timeFrame: string): DateRange {
  // If timeFrame is a simple keyword that toISO8601 can handle directly
  if (['today', 'yesterday', 'last-week', 'last-month', 'start-of-year'].includes(timeFrame.toLowerCase())) {
    return {
      startDate: toISO8601(timeFrame),
      endDate: toISO8601('now')
    };
  }

  const now = new Date();
  let startDate = new Date(now);
  let endDate = new Date(now);
  
  const normalizedTimeFrame = timeFrame.toLowerCase();
  
  // Handle special cases first
  if (normalizedTimeFrame === 'previous-calendar-week') {
    const today = now.getDay(); // 0 is Sunday, 6 is Saturday
    
    // Calculate previous week's Sunday
    startDate = new Date(now);
    startDate.setDate(now.getDate() - today - 7);
    startDate.setHours(0, 0, 0, 0);
    
    // Calculate previous week's Saturday
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  }
  // Handle trailing periods (last 7 days, etc.)
  else if (normalizedTimeFrame === 'last-7-days' || normalizedTimeFrame === 'last-week') {
    startDate.setDate(now.getDate() - 7);
  }
  // Handle past-Nd format (days)
  else if (normalizedTimeFrame.startsWith('past-') && normalizedTimeFrame.endsWith('d')) {
    const days = parseInt(normalizedTimeFrame.substring(5, normalizedTimeFrame.length - 1));
    if (!isNaN(days)) {
      startDate.setDate(now.getDate() - days);
    }
  }
  // Handle past-Nw format (weeks)
  else if (normalizedTimeFrame.startsWith('past-') && normalizedTimeFrame.endsWith('w')) {
    const weeks = parseInt(normalizedTimeFrame.substring(5, normalizedTimeFrame.length - 1));
    if (!isNaN(weeks)) {
      startDate.setDate(now.getDate() - (weeks * 7));
    }
  }
  // Handle past-Nm format (months)
  else if (normalizedTimeFrame.startsWith('past-') && normalizedTimeFrame.endsWith('m')) {
    const months = parseInt(normalizedTimeFrame.substring(5, normalizedTimeFrame.length - 1));
    if (!isNaN(months)) {
      startDate.setMonth(now.getMonth() - months);
    }
  }
  // Handle past-Ny format (years)
  else if (normalizedTimeFrame.startsWith('past-') && normalizedTimeFrame.endsWith('y')) {
    const years = parseInt(normalizedTimeFrame.substring(5, normalizedTimeFrame.length - 1));
    if (!isNaN(years)) {
      startDate.setFullYear(now.getFullYear() - years);
    }
  }
  // Handle ytd (year to date)
  else if (normalizedTimeFrame === 'ytd') {
    startDate = new Date(now.getFullYear(), 0, 1); // January 1st of current year
  }
  // Handle qtd (quarter to date)
  else if (normalizedTimeFrame === 'qtd') {
    const quarter = Math.floor(now.getMonth() / 3);
    startDate = new Date(now.getFullYear(), quarter * 3, 1);
  }
  // Handle mtd (month to date)
  else if (normalizedTimeFrame === 'mtd') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  // Handle wtd (week to date - starting from Sunday)
  else if (normalizedTimeFrame === 'wtd') {
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    startDate.setDate(now.getDate() - day);
  }
  // Default to 7 days if format not recognized
  else {
    startDate.setDate(now.getDate() - 7);
    console.warn(`Unrecognized timeFrame format: ${timeFrame}. Defaulting to past 7 days.`);
  }
  
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
}

/**
 * Natural language processing for time periods
 * This function handles natural language queries and converts them to standardized time frame strings
 * @param query Natural language query like "what was the price last week" or "show me prices from last month"
 * @returns Standardized time frame string
 */
export function parseNaturalLanguageTimeFrame(query: string): string {
  const normalizedQuery = query.toLowerCase();
  
  if (normalizedQuery.includes('last week') || normalizedQuery.includes('previous week')) {
    return 'last-week';
  }
  else if (normalizedQuery.includes('last month') || normalizedQuery.includes('previous month')) {
    return 'last-month';
  }
  else if (normalizedQuery.includes('yesterday')) {
    return 'yesterday';
  }
  else if (normalizedQuery.includes('last year') || normalizedQuery.includes('previous year')) {
    return 'past-1y';
  }
  else if (normalizedQuery.includes('this year') || normalizedQuery.includes('year to date') || normalizedQuery.includes('ytd')) {
    return 'ytd';
  }
  else if (normalizedQuery.includes('this month') || normalizedQuery.includes('month to date') || normalizedQuery.includes('mtd')) {
    return 'mtd';
  }
  else if (normalizedQuery.includes('this quarter') || normalizedQuery.includes('quarter to date') || normalizedQuery.includes('qtd')) {
    return 'qtd';
  }
  else if (normalizedQuery.includes('calendar week')) {
    return 'previous-calendar-week';
  }
  
  // Default to last 7 days if no specific time frame mentioned
  return 'last-7-days';
} 

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

