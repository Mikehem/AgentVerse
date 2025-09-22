/**
 * Date utility functions for Agent Lens
 */

export function safeFormatDate(timestamp: string | null | undefined): string {
  if (!timestamp) return 'N/A'
  
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return 'Invalid Date'
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch (error) {
    return 'Invalid Date'
  }
}

export function safeFormatDateTime(timestamp: string | null | undefined): string {
  if (!timestamp) return 'N/A'
  
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return 'Invalid Date'
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (error) {
    return 'Invalid Date'
  }
}

export function safeFormatTime(timestamp: string | null | undefined): string {
  if (!timestamp) return 'N/A'
  
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return 'Invalid Date'
    
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (error) {
    return 'Invalid Date'
  }
}

export function isValidTimestamp(timestamp: string | null | undefined): boolean {
  if (!timestamp) return false
  
  try {
    const date = new Date(timestamp)
    return !isNaN(date.getTime())
  } catch (error) {
    return false
  }
}

export function ensureISOString(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return new Date().toISOString()
  
  try {
    if (timestamp instanceof Date) {
      return timestamp.toISOString()
    }
    
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return new Date().toISOString()
    
    return date.toISOString()
  } catch (error) {
    return new Date().toISOString()
  }
}