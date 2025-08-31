'use client'

import React from 'react'

interface StatsCardProps {
  title: string
  value: number | string
  icon?: React.ReactNode
  change?: {
    value: number
    type: 'increase' | 'decrease'
    period?: string
  }
  description?: string
  loading?: boolean
  onClick?: () => void
  className?: string
}

export default function StatsCard({
  title,
  value,
  icon,
  change,
  description,
  loading = false,
  onClick,
  className = ""
}: StatsCardProps) {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`
      }
      return val.toLocaleString()
    }
    return val.toString()
  }

  const getChangeColor = (type: 'increase' | 'decrease') => {
    return type === 'increase' 
      ? 'text-success-600 bg-success-50' 
      : 'text-error-600 bg-error-50'
  }

  const getChangeIcon = (type: 'increase' | 'decrease') => {
    return type === 'increase' ? (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    )
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-monastery-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-monastery-200 rounded w-24"></div>
            <div className="h-8 w-8 bg-monastery-200 rounded"></div>
          </div>
          <div className="h-8 bg-monastery-200 rounded w-16 mb-2"></div>
          <div className="h-4 bg-monastery-200 rounded w-20"></div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`
        bg-white rounded-xl border border-monastery-200 p-6 transition-all duration-200
        ${onClick ? 'cursor-pointer hover:shadow-large hover:-translate-y-1' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-monastery-600 uppercase tracking-wide">
          {title}
        </h3>
        {icon && (
          <div className="text-primary-500">
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mb-2">
        <span className="text-3xl font-bold text-monastery-900">
          {formatValue(value)}
        </span>
      </div>

      {/* Change indicator and description */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col space-y-1">
          {change && (
            <div className={`
              inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
              ${getChangeColor(change.type)}
            `}>
              {getChangeIcon(change.type)}
              <span className="ml-1">
                {Math.abs(change.value)}%
              </span>
              {change.period && (
                <span className="ml-1 opacity-75">
                  {change.period}
                </span>
              )}
            </div>
          )}
          {description && (
            <p className="text-xs text-monastery-500">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}