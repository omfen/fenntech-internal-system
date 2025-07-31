import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, List, Download, Filter, SortAsc } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ViewOptionsProps {
  title: string;
  data: any[];
  renderCard: (item: any) => React.ReactNode;
  renderListItem: (item: any) => React.ReactNode;
  columns: string[];
  onExport?: (format: 'csv' | 'json') => void;
  filterOptions?: { label: string; value: string; count?: number }[];
  sortOptions?: { label: string; value: string }[];
  onFilter?: (filter: string) => void;
  onSort?: (sort: string) => void;
  showExport?: boolean;
  showFilter?: boolean;
  showSort?: boolean;
}

export default function ViewOptions({
  title,
  data,
  renderCard,
  renderListItem,
  columns,
  onExport,
  filterOptions = [],
  sortOptions = [],
  onFilter,
  onSort,
  showExport = true,
  showFilter = false,
  showSort = false
}: ViewOptionsProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [currentFilter, setCurrentFilter] = useState<string>('all');
  const [currentSort, setCurrentSort] = useState<string>('newest');

  const handleExport = (format: 'csv' | 'json') => {
    if (onExport) {
      onExport(format);
    } else {
      // Default export implementation
      if (format === 'csv') {
        exportToCSV();
      } else {
        exportToJSON();
      }
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) return;
    
    const headers = columns.join(',');
    const csvData = data.map(item => 
      columns.map(col => {
        const value = item[col];
        // Handle nested objects and arrays
        if (typeof value === 'object' && value !== null) {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value || '').replace(/"/g, '""')}"`;
      }).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${csvData}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFilter = (filter: string) => {
    setCurrentFilter(filter);
    if (onFilter) {
      onFilter(filter);
    }
  };

  const handleSort = (sort: string) => {
    setCurrentSort(sort);
    if (onSort) {
      onSort(sort);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Options */}
            {showFilter && filterOptions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-filter">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                    {currentFilter !== 'all' && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {filterOptions.find(f => f.value === currentFilter)?.label}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleFilter('all')}>
                    All Items
                  </DropdownMenuItem>
                  {filterOptions.map((option) => (
                    <DropdownMenuItem key={option.value} onClick={() => handleFilter(option.value)}>
                      {option.label}
                      {option.count !== undefined && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {option.count}
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Sort Options */}
            {showSort && sortOptions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-sort">
                    <SortAsc className="h-4 w-4 mr-2" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {sortOptions.map((option) => (
                    <DropdownMenuItem key={option.value} onClick={() => handleSort(option.value)}>
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Export Options */}
            {showExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-export">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* View Mode Toggle */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="rounded-r-none"
                data-testid="button-view-cards"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
                data-testid="button-view-list"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No {title.toLowerCase()} found</p>
          </div>
        ) : (
          <>
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.map((item) => renderCard(item))}
              </div>
            ) : (
              <div className="space-y-2">
                {data.map((item) => renderListItem(item))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}