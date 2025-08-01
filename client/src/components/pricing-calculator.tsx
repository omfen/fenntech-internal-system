import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudUpload, FolderOpen, Plus, Trash2, Calculator, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Category, PricingItem } from "@shared/schema";

interface PricingCalculatorProps {
  exchangeRate: number;
}

export default function PricingCalculator({ exchangeRate }: PricingCalculatorProps) {
  const [items, setItems] = useState<PricingItem[]>([]);
  const [roundingOption, setRoundingOption] = useState<number>(100);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);
      const response = await apiRequest('POST', '/api/extract-pdf', formData);
      return response.json();
    },
    onSuccess: (data) => {
      setItems(data.extractedItems);
      toast({
        title: "PDF Processed",
        description: `Extracted ${data.extractedItems.length} potential items`,
      });
    },
    onError: (error: any) => {
      let errorMessage = "Failed to process PDF file";
      
      if (error.message.includes("400")) {
        if (error.message.includes("No PDF file uploaded")) {
          errorMessage = "Please select a PDF file to upload";
        } else if (error.message.includes("File must be a PDF")) {
          errorMessage = "Please select a valid PDF file";
        }
      }
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const totalValue = items.reduce((sum, item) => sum + item.finalPrice, 0);
      const sessionData = {
        invoiceNumber: invoiceNumber || undefined,
        exchangeRate: exchangeRate.toString(),
        roundingOption,
        items,
        totalValue: totalValue.toString(),
        status: "pending",
      };
      
      const response = await apiRequest('POST', '/api/pricing-sessions', sessionData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Pricing Saved & Report Sent",
        description: `Session ${data.id} saved successfully. Copy this ID to send email reports.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-sessions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save pricing calculation",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      uploadMutation.mutate(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a PDF file",
        variant: "destructive",
      });
    }
  };

  const addNewItem = () => {
    const newItem: PricingItem = {
      id: `item-${Date.now()}`,
      description: "",
      costUsd: 0,
      categoryId: "",
      categoryName: "",
      markupPercentage: 0,
      costJmd: 0,
      sellingPrice: 0,
      finalPrice: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<PricingItem>) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const calculatePrices = () => {
    if (exchangeRate <= 0) {
      toast({
        title: "Invalid Exchange Rate",
        description: "Please set a valid exchange rate",
        variant: "destructive",
      });
      return;
    }

    const updatedItems = items.map(item => {
      if (!item.categoryId) return item;

      // Formula: (Item cost × exchange rate) + 15% GCT = Item Cost
      const costJmd = (item.costUsd * exchangeRate) * 1.15; // Adding 15% GCT
      
      // Item cost plus markup % = Selling Price
      const sellingPrice = costJmd * (1 + item.markupPercentage / 100);
      
      // Round to nearest option
      const finalPrice = Math.ceil(sellingPrice / roundingOption) * roundingOption;

      return {
        ...item,
        costJmd,
        sellingPrice,
        finalPrice,
      };
    });

    setItems(updatedItems);
    toast({
      title: "Prices Calculated",
      description: "All prices have been calculated successfully",
    });
  };

  const handleCategoryChange = (itemId: string, categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (category) {
      updateItem(itemId, {
        categoryId,
        categoryName: category.name,
        markupPercentage: parseFloat(category.markupPercentage),
      });
    }
  };

  const saveAndSendReport = () => {
    if (items.length === 0) {
      toast({
        title: "No Items",
        description: "Please add items before saving",
        variant: "destructive",
      });
      return;
    }

    const hasValidItems = items.some(item => item.categoryId && item.costUsd > 0);
    if (!hasValidItems) {
      toast({
        title: "Invalid Items",
        description: "Please ensure items have valid categories and costs",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate();
  };

  return (
    <Card data-testid="pricing-calculator">
      <CardHeader className="border-b border-gray-200 p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">
          Intcomex Pricing Calculator
        </CardTitle>
        <p className="text-xs sm:text-sm text-gray-600">Upload invoice and calculate selling prices or click add manually to begin pricing</p>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Invoice Number */}
        <div>
          <Label htmlFor="invoice-number" className="text-sm">Invoice Number (Optional)</Label>
          <Input
            id="invoice-number"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="INV-2024-001"
            className="mt-1"
            data-testid="input-invoice-number"
          />
        </div>

        {/* PDF Upload Area */}
        <div 
          className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-8 text-center hover:border-primary transition-colors cursor-pointer"
          onClick={handleFileSelect}
          data-testid="pdf-upload-area"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
            data-testid="file-input-pdf"
          />
          <CloudUpload className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Upload Invoice PDF</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">Drag and drop your PDF invoice or click to browse</p>
          <Button className="bg-primary text-white hover:bg-blue-700 text-sm" data-testid="button-choose-file">
            <FolderOpen className="w-4 h-4 mr-2" />
            Choose File
          </Button>
          <p className="text-xs text-gray-500 mt-2">PDF files only, max 10MB</p>
        </div>

        {/* Items - Responsive Layout */}
        {items.length > 0 && (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg" data-testid="items-table">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Item Description</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Cost (USD)</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Markup %</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Selling Price (JMD)</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50" data-testid={`item-row-${item.id}`}>
                      <td className="px-4 py-3">
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          placeholder="Item description"
                          className="w-full"
                          data-testid={`input-description-${item.id}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.costUsd}
                          onChange={(e) => updateItem(item.id, { costUsd: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                          className="w-full"
                          data-testid={`input-cost-${item.id}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Select 
                          value={item.categoryId} 
                          onValueChange={(value) => handleCategoryChange(item.id, value)}
                        >
                          <SelectTrigger data-testid={`select-category-${item.id}`}>
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name} ({category.markupPercentage}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900" data-testid={`text-markup-${item.id}`}>
                        {item.markupPercentage}%
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-secondary" data-testid={`text-final-price-${item.id}`}>
                        ${item.finalPrice.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-800"
                          data-testid={`button-remove-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {items.map((item) => (
                <Card key={item.id} className="border border-gray-200" data-testid={`item-card-${item.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 mr-3">
                        <Label htmlFor={`mobile-description-${item.id}`} className="text-xs text-gray-600">Item Description</Label>
                        <Input
                          id={`mobile-description-${item.id}`}
                          value={item.description}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          placeholder="Item description"
                          className="mt-1 text-sm"
                          data-testid={`input-description-mobile-${item.id}`}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        data-testid={`button-remove-mobile-${item.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`mobile-cost-${item.id}`} className="text-xs text-gray-600">Cost (USD)</Label>
                        <Input
                          id={`mobile-cost-${item.id}`}
                          type="number"
                          step="0.01"
                          value={item.costUsd}
                          onChange={(e) => updateItem(item.id, { costUsd: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                          className="mt-1 text-sm"
                          data-testid={`input-cost-mobile-${item.id}`}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Category</Label>
                        <Select 
                          value={item.categoryId} 
                          onValueChange={(value) => handleCategoryChange(item.id, value)}
                        >
                          <SelectTrigger className="mt-1" data-testid={`select-category-mobile-${item.id}`}>
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name} ({category.markupPercentage}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                      <div>
                        <span className="text-xs text-gray-600">Markup:</span>
                        <div className="text-sm font-medium text-gray-900" data-testid={`text-markup-mobile-${item.id}`}>
                          {item.markupPercentage}%
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600">Final Price:</span>
                        <div className="text-sm font-bold text-secondary" data-testid={`text-final-price-mobile-${item.id}`}>
                          ${item.finalPrice.toLocaleString()} JMD
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Button
          variant="outline"
          onClick={addNewItem}
          className="w-full border-2 border-dashed border-gray-300 text-gray-600 hover:bg-gray-200"
          data-testid="button-add-item"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item Manually
        </Button>

        {/* Rounding Options */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Rounding Options</h4>
          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
            {[100, 1000, 10000].map((option) => (
              <label key={option} className="flex items-center">
                <input
                  type="radio"
                  name="rounding"
                  value={option}
                  checked={roundingOption === option}
                  onChange={(e) => setRoundingOption(parseInt(e.target.value))}
                  className="mr-2 text-primary"
                  data-testid={`radio-rounding-${option}`}
                />
                <span className="text-sm">Nearest ${option.toLocaleString()}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            onClick={calculatePrices}
            className="flex-1 bg-primary text-white hover:bg-blue-700 text-sm"
            disabled={items.length === 0}
            data-testid="button-calculate-prices"
          >
            <Calculator className="w-4 h-4 mr-2" />
            Calculate Prices
          </Button>
          <Button
            onClick={saveAndSendReport}
            className="flex-1 bg-secondary text-white hover:bg-green-700 text-sm"
            disabled={saveMutation.isPending || items.length === 0}
            data-testid="button-save-report"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save & Get Session ID"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
