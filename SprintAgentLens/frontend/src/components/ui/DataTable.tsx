'use client'

import { useState } from 'react'
import { Edit, Trash2, Plus, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: keyof T | 'actions'
  label: string
  render?: (value: any, item: T) => React.ReactNode
  sortable?: boolean
  width?: string
}

interface DataTableProps<T extends { id: string }> {
  data: T[]
  columns: Column<T>[]
  title: string
  description?: string
  onAdd?: () => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  onToggleStatus?: (item: T) => void
  loading?: boolean
  searchable?: boolean
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  title,
  description,
  onAdd,
  onEdit,
  onDelete,
  onToggleStatus,
  loading = false,
  searchable = true
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Ensure data is an array and filter based on search query
  const safeData = Array.isArray(data) ? data : []
  const filteredData = searchable
    ? safeData.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : safeData

  // Sort data
  const sortedData = sortColumn
    ? [...filteredData].sort((a, b) => {
        const aValue = a[sortColumn]
        const bValue = b[sortColumn]
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    : filteredData

  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{title}</h1>
          {description && <p className="text-muted mt-1">{description}</p>}
        </div>
        {onAdd && (
          <button onClick={onAdd} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Add New
          </button>
        )}
      </div>

      {/* Search and Filters */}
      {searchable && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted mt-2">Loading...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-light border-b border-light">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={String(column.key)}
                      className={cn(
                        "px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider",
                        column.sortable && column.key !== 'actions' && "cursor-pointer hover:bg-background",
                        column.width && `w-${column.width}`
                      )}
                      onClick={() => {
                        if (column.sortable && column.key !== 'actions') {
                          handleSort(column.key as keyof T)
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {column.label}
                        {column.sortable && column.key !== 'actions' && sortColumn === column.key && (
                          <span className="text-primary">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-light">
                {sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-8 text-center text-muted">
                      {searchQuery ? 'No results found' : 'No data available'}
                    </td>
                  </tr>
                ) : (
                  sortedData.map((item) => (
                    <tr key={item.id} className="hover:bg-background-light transition-colors">
                      {columns.map((column) => (
                        <td key={String(column.key)} className="px-6 py-4 whitespace-nowrap">
                          {column.key === 'actions' ? (
                            <div className="flex items-center gap-2">
                              {onEdit && (
                                <button
                                  onClick={() => onEdit(item)}
                                  className="p-1 rounded hover:bg-primary-alpha transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4 text-primary" />
                                </button>
                              )}
                              {onToggleStatus && (
                                <button
                                  onClick={() => onToggleStatus(item)}
                                  className="p-1 rounded hover:bg-accent-alpha transition-colors"
                                  title={(item as any).isActive ? "Deactivate" : "Activate"}
                                >
                                  {(item as any).isActive ? (
                                    <EyeOff className="w-4 h-4 text-warning" />
                                  ) : (
                                    <Eye className="w-4 h-4 text-success" />
                                  )}
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  onClick={() => onDelete(item)}
                                  className="p-1 rounded hover:bg-error/10 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4 text-error" />
                                </button>
                              )}
                            </div>
                          ) : column.render ? (
                            column.render((item as any)[column.key], item)
                          ) : (
                            <span className="text-sm text-primary">
                              {String((item as any)[column.key])}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-sm text-muted">
        <span>
          Showing {sortedData.length} of {data.length} {sortedData.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>
    </div>
  )
}