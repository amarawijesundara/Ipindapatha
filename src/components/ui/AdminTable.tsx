'use client'

import React, { useState } from 'react'
import { Button, Input, Loading } from '@/components/ui'

interface Column<T> {
  key: keyof T | string
  label: string
  render?: (item: T) => React.ReactNode
  sortable?: boolean
  searchable?: boolean
}

interface AdminTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  onRowClick?: (item: T) => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  searchable?: boolean
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
}

export default function AdminTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  onRowClick,
  onEdit,
  onDelete,
  searchable = true,
  searchPlaceholder = "Search...",
  emptyMessage = "No data found",
  className = ""
}: AdminTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Filter data based on search
  const filteredData = data.filter(item => {
    if (!search) return true
    
    return columns.some(column => {
      if (!column.searchable && column.searchable !== undefined) return false
      
      const value = column.key.toString().split('.').reduce((obj, key) => obj?.[key], item)
      return value?.toString().toLowerCase().includes(search.toLowerCase())
    })
  })

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0
    
    const aValue = sortColumn.split('.').reduce((obj, key) => obj?.[key], a)
    const bValue = sortColumn.split('.').reduce((obj, key) => obj?.[key], b)
    
    if (aValue === bValue) return 0
    
    const comparison = aValue > bValue ? 1 : -1
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const handleSort = (columnKey: string) => {
    if (!columns.find(col => col.key === columnKey)?.sortable) return
    
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }

  const getCellValue = (item: T, column: Column<T>) => {
    if (column.render) {
      return column.render(item)
    }
    
    const value = column.key.toString().split('.').reduce((obj, key) => obj?.[key], item)
    return value?.toString() || '-'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-monastery-200 p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loading size="lg" />
          <p className="text-monastery-600">Loading data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl border border-monastery-200 overflow-hidden ${className}`}>
      {/* Search bar */}
      {searchable && (
        <div className="p-4 border-b border-monastery-200">
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
            className="max-w-sm"
          />
          {search && (
            <p className="text-sm text-monastery-600 mt-2">
              {filteredData.length} of {data.length} items
            </p>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-monastery-50">
              {columns.map((column) => (
                <th
                  key={column.key.toString()}
                  className={`
                    text-left px-4 py-3 text-sm font-semibold text-monastery-800
                    ${column.sortable ? 'cursor-pointer hover:bg-monastery-100' : ''}
                  `}
                  onClick={() => column.sortable && handleSort(column.key.toString())}
                >
                  <div className="flex items-center space-x-2">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <svg
                          className={`w-3 h-3 ${
                            sortColumn === column.key && sortDirection === 'asc'
                              ? 'text-primary-600'
                              : 'text-monastery-400'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        <svg
                          className={`w-3 h-3 -mt-1 ${
                            sortColumn === column.key && sortDirection === 'desc'
                              ? 'text-primary-600'
                              : 'text-monastery-400'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="text-right px-4 py-3 text-sm font-semibold text-monastery-800">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="text-center py-8">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="text-4xl text-monastery-300">📊</div>
                    <p className="text-monastery-600">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedData.map((item, index) => (
                <tr
                  key={index}
                  className={`
                    border-t border-monastery-100 transition-colors
                    ${onRowClick ? 'cursor-pointer hover:bg-monastery-50' : ''}
                  `}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <td key={column.key.toString()} className="px-4 py-3 text-sm text-monastery-700">
                      {getCellValue(item, column)}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {onEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEdit(item)
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            size="sm"
                            variant="error"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDelete(item)
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with pagination info */}
      {sortedData.length > 0 && (
        <div className="px-4 py-3 border-t border-monastery-200 text-sm text-monastery-600">
          Showing {sortedData.length} {sortedData.length === 1 ? 'item' : 'items'}
          {search && ` (filtered from ${data.length} total)`}
        </div>
      )}
    </div>
  )
}