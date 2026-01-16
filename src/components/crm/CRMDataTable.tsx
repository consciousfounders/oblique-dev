import * as React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowUpDown, ArrowUp, ArrowDown, Settings2, MoreHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CRMColumn<T> {
  id: string
  header: string
  accessorKey?: keyof T
  cell?: (row: T) => React.ReactNode
  sortable?: boolean
  hideable?: boolean
  defaultHidden?: boolean
  className?: string
}

export interface CRMRowAction<T> {
  label: string
  icon?: LucideIcon
  onClick: (row: T) => void
  variant?: 'default' | 'destructive'
  condition?: (row: T) => boolean
}

export interface CRMBulkAction<T> {
  label: string
  icon?: LucideIcon
  onClick: (rows: T[]) => void
  variant?: 'default' | 'destructive'
}

export type SortDirection = 'asc' | 'desc' | null

interface CRMDataTableProps<T> {
  data: T[]
  columns: CRMColumn<T>[]
  rowKey: keyof T
  rowActions?: CRMRowAction<T>[]
  bulkActions?: CRMBulkAction<T>[]
  onRowClick?: (row: T) => void
  sortColumn?: string
  sortDirection?: SortDirection
  onSort?: (column: string, direction: SortDirection) => void
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export function CRMDataTable<T>({
  data,
  columns,
  rowKey,
  rowActions = [],
  bulkActions = [],
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
  loading = false,
  emptyMessage = 'No data found',
  className,
}: CRMDataTableProps<T>) {
  const [selectedRows, setSelectedRows] = React.useState<Set<unknown>>(new Set())
  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>(() => {
    const visibility: Record<string, boolean> = {}
    columns.forEach((col) => {
      visibility[col.id] = !col.defaultHidden
    })
    return visibility
  })

  const visibleColumns = columns.filter((col) => columnVisibility[col.id] !== false)
  const hideableColumns = columns.filter((col) => col.hideable !== false)

  const toggleSelectAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(data.map((row) => row[rowKey])))
    }
  }

  const toggleSelectRow = (key: unknown) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedRows(newSelected)
  }

  const handleSort = (columnId: string) => {
    if (!onSort) return

    let newDirection: SortDirection = 'asc'
    if (sortColumn === columnId) {
      if (sortDirection === 'asc') {
        newDirection = 'desc'
      } else if (sortDirection === 'desc') {
        newDirection = null
      }
    }
    onSort(columnId, newDirection)
  }

  const selectedData = data.filter((row) => selectedRows.has(row[rowKey]))
  const hasBulkActions = bulkActions.length > 0
  const hasRowActions = rowActions.length > 0
  const hasSelection = hasBulkActions

  const renderSortIcon = (columnId: string) => {
    if (sortColumn !== columnId) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="ml-2 h-4 w-4" />
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="ml-2 h-4 w-4" />
    }
    return <ArrowUpDown className="ml-2 h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedRows.size > 0 && hasBulkActions && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedRows.size} selected
              </span>
              {bulkActions.map((action, index) => {
                const ActionIcon = action.icon
                return (
                  <Button
                    key={index}
                    variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => action.onClick(selectedData)}
                  >
                    {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
                    {action.label}
                  </Button>
                )
              })}
            </>
          )}
        </div>
        {hideableColumns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {hideableColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={columnVisibility[column.id] !== false}
                  onCheckedChange={(checked) =>
                    setColumnVisibility((prev) => ({
                      ...prev,
                      [column.id]: checked,
                    }))
                  }
                >
                  {column.header}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {hasSelection && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={data.length > 0 && selectedRows.size === data.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              {visibleColumns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(column.className, column.sortable && 'cursor-pointer select-none')}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className="flex items-center">
                    {column.header}
                    {column.sortable && renderSortIcon(column.id)}
                  </div>
                </TableHead>
              ))}
              {hasRowActions && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + (hasSelection ? 1 : 0) + (hasRowActions ? 1 : 0)}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => {
                const key = row[rowKey] as string | number
                const isSelected = selectedRows.has(key)
                return (
                  <TableRow
                    key={key}
                    data-state={isSelected && 'selected'}
                    className={cn(onRowClick && 'cursor-pointer')}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('[data-no-row-click]')) return
                      onRowClick?.(row)
                    }}
                  >
                    {hasSelection && (
                      <TableCell data-no-row-click>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectRow(key)}
                          aria-label="Select row"
                        />
                      </TableCell>
                    )}
                    {visibleColumns.map((column) => (
                      <TableCell key={column.id} className={column.className}>
                        {column.cell
                          ? column.cell(row)
                          : column.accessorKey
                          ? String(row[column.accessorKey] ?? '')
                          : ''}
                      </TableCell>
                    ))}
                    {hasRowActions && (
                      <TableCell data-no-row-click>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {rowActions.map((action, index) => {
                              if (action.condition && !action.condition(row)) {
                                return null
                              }
                              const ActionIcon = action.icon
                              const isDestructive = action.variant === 'destructive'
                              return (
                                <React.Fragment key={index}>
                                  {isDestructive && index > 0 && <DropdownMenuSeparator />}
                                  <DropdownMenuItem
                                    onClick={() => action.onClick(row)}
                                    className={cn(isDestructive && 'text-destructive')}
                                  >
                                    {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
                                    {action.label}
                                  </DropdownMenuItem>
                                </React.Fragment>
                              )
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
