import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle, Loader2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ContextualHelpProps {
  context: string;
  element?: string;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

interface HelpResponse {
  explanation: string;
  tips?: string[];
  relatedFeatures?: string[];
}

export function ContextualHelp({ 
  context, 
  element = "",
  position = "top",
  className = ""
}: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: helpContent, isLoading, error } = useQuery<HelpResponse>({
    queryKey: ["/api/help", context, element],
    queryFn: async () => {
      const response = await apiRequest("/api/help", "POST", {
        context,
        element,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
      return response;
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50 ${className}`}
          data-testid={`help-${context}-${element}`}
        >
          <HelpCircle className="h-4 w-4" />
          <span className="sr-only">Get help for {context}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side={position}
        className="w-80 p-0"
        data-testid={`help-content-${context}`}
      >
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <HelpCircle className="h-4 w-4 text-blue-500" />
                <h4 className="font-semibold text-sm">Contextual Help</h4>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsOpen(false)}
                data-testid="help-close"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-gray-600">Generating help...</span>
              </div>
            )}

            {error && (
              <div className="text-center py-4">
                <p className="text-sm text-red-600 mb-2">Unable to load help content</p>
                <p className="text-xs text-gray-500">Please try again or contact support</p>
              </div>
            )}

            {helpContent && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {helpContent.explanation}
                  </p>
                </div>

                {helpContent.tips && helpContent.tips.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Quick Tips
                    </h5>
                    <ul className="space-y-1">
                      {helpContent.tips.map((tip, index) => (
                        <li key={index} className="text-xs text-gray-600 flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {helpContent.relatedFeatures && helpContent.relatedFeatures.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Related Features
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {helpContent.relatedFeatures.map((feature, index) => (
                        <span 
                          key={index}
                          className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

// Convenience component for form field help
export function FormFieldHelp({ 
  fieldName, 
  formContext,
  position = "right" 
}: { 
  fieldName: string; 
  formContext: string;
  position?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <ContextualHelp
      context={`form-${formContext}`}
      element={fieldName}
      position={position}
      className="ml-1"
    />
  );
}

// Convenience component for page section help
export function SectionHelp({ 
  section, 
  page,
  position = "bottom" 
}: { 
  section: string; 
  page: string;
  position?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <ContextualHelp
      context={`page-${page}`}
      element={section}
      position={position}
      className="ml-2"
    />
  );
}