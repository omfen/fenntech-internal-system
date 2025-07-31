import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LayoutGrid, List, Download, SortAsc } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ViewOptionsProps {
  view: 'cards' | 'list';
  onViewChange: (view: 'cards' | 'list') => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  searchPlaceholder?: string;
  sortBy: string;
  onSortByChange: (sortBy: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  sortOptions: { value: string; label: string }[];
  onExport: () => any[];
  exportFilename: string;
}

export default function ViewOptions({
  view,
  onViewChange,
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  sortOptions,
  onExport,
  exportFilename
}: ViewOptionsProps) {

  const handleExport = (format: 'csv' | 'json') => {
    const data = onExport();
    
    if (format === 'csv') {
      exportToCSV(data);
    } else {
      exportToJSON(data);
    }
  };

  const exportToCSV = (data: any[]) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(',');
    const csvData = data.map(item => 
      Object.values(item).map(value => {
        // Handle nested objects and arrays
        if (typeof value === 'object' && value !== null) {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value || '').replace(/"/g, '""')}"`;
      }).join(',')
    ).join('\n');
    
    const csvContent = `${headers}\n${csvData}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${exportFilename}_export.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const exportToJSON = (data: any[]) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${exportFilename}_export.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        
        {/* Search Input */}
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-md shadow-sm">
            <Button
              variant={view === 'cards' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewChange('cards')}
              className="rounded-r-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewChange('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SortAsc className="h-4 w-4 mr-2" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onSortByChange(option.value)}
                  className={sortBy === option.value ? 'bg-gray-100' : ''}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
              <div className="border-t my-1"></div>
              <DropdownMenuItem onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}>
                {sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
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
        </div>
      </div>
    </div>
  );
}