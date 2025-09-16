import { type ClassValue, clsx } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function formatPercentage(num: number): string {
  return `${num.toFixed(1)}%`
}

export function generateProjectCode(projectName: string): string {
  // Extract meaningful words from project name
  const words = projectName
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '') // Remove special characters
    .split(/\s+/)
    .filter(word => word.length > 0)
  
  // Create acronym from first letters
  const acronym = words
    .slice(0, 3) // Max 3 words for acronym
    .map(word => word.charAt(0))
    .join('')
  
  // Add timestamp suffix for uniqueness
  const timestamp = new Date().getFullYear().toString().slice(-2) + 
                   String(Date.now()).slice(-4) // Last 4 digits of timestamp
  
  // Format: ACRONYM-TIMESTAMP (e.g., ECS-25-1234)
  return `${acronym}-${timestamp}`
}

export function validateProjectCode(code: string): boolean {
  // Pattern: 2-4 letters, dash, 2-6 numbers (e.g., ECS-251234, HEALTH-25001)
  const pattern = /^[A-Z]{2,4}-[0-9]{2,6}$/
  return pattern.test(code)
}