import { SupportedCurrency } from '@/types'

/**
 * Format a number as currency using the appropriate currency symbol and formatting
 * @param amount - The numeric amount to format
 * @param currency - The currency code (USD or LKR)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: SupportedCurrency = 'USD'): string {
  // Handle LKR with Sri Lankan formatting preferences
  if (currency === 'LKR') {
    // Sri Lankan Rupee - typically displayed as "Rs. 1,234.00"
    return `Rs. ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`
  }

  // Handle USD with standard US formatting
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Get the currency symbol for a supported currency
 * @param currency - The currency code
 * @returns Currency symbol string
 */
export function getCurrencySymbol(currency: SupportedCurrency): string {
  switch (currency) {
    case 'USD':
      return '$'
    case 'LKR':
      return 'Rs.'
    default:
      return '$'
  }
}

/**
 * Get the currency name for a supported currency
 * @param currency - The currency code
 * @returns Full currency name
 */
export function getCurrencyName(currency: SupportedCurrency): string {
  switch (currency) {
    case 'USD':
      return 'US Dollar'
    case 'LKR':
      return 'Sri Lankan Rupee'
    default:
      return 'US Dollar'
  }
}

/**
 * Format currency for compact display (without decimals for whole numbers)
 * @param amount - The numeric amount to format
 * @param currency - The currency code (USD or LKR)
 * @returns Formatted currency string in compact format
 */
export function formatCurrencyCompact(amount: number, currency: SupportedCurrency = 'USD'): string {
  const isWholeNumber = amount % 1 === 0

  if (currency === 'LKR') {
    if (isWholeNumber) {
      return `Rs. ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    } else {
      return `Rs. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
  }

  // USD formatting
  if (isWholeNumber) {
    return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  } else {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }
}