import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Calendar } from "lucide-react";
import { format } from "date-fns";

interface DateTimeInputProps {
  value?: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  includeTime?: boolean;
  defaultIncludeTime?: boolean;
  testId?: string;
}

export default function DateTimeInput({
  value = "",
  onChange,
  label,
  placeholder,
  required = false,
  disabled = false,
  includeTime = true,
  defaultIncludeTime = false,
  testId,
}: DateTimeInputProps) {
  const [includeTimeOption, setIncludeTimeOption] = useState(
    defaultIncludeTime || (value && value.includes("T"))
  );

  // Parse existing value to date and time components
  const parseDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return { date: "", time: "" };
    
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return { date: "", time: "" };
    
    const dateStr = format(date, "yyyy-MM-dd");
    const timeStr = format(date, "HH:mm");
    
    return { date: dateStr, time: timeStr };
  };

  const { date: currentDate, time: currentTime } = parseDateTime(value);

  const handleDateChange = (newDate: string) => {
    if (!newDate) {
      onChange("");
      return;
    }

    let newDateTime = newDate;
    if (includeTimeOption && currentTime) {
      newDateTime = `${newDate}T${currentTime}`;
    } else if (includeTimeOption) {
      // Default to 09:00 if no time specified
      newDateTime = `${newDate}T09:00`;
    }
    
    onChange(newDateTime);
  };

  const handleTimeChange = (newTime: string) => {
    if (!currentDate) return;
    
    const newDateTime = newTime ? `${currentDate}T${newTime}` : currentDate;
    onChange(newDateTime);
  };

  const handleIncludeTimeChange = (checked: boolean) => {
    setIncludeTimeOption(checked);
    
    if (currentDate) {
      if (checked) {
        // Add time component (default to 09:00)
        const newDateTime = `${currentDate}T${currentTime || "09:00"}`;
        onChange(newDateTime);
      } else {
        // Remove time component
        onChange(currentDate);
      }
    }
  };

  return (
    <div className="space-y-3">
      <Label htmlFor={testId} className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      
      <Card className="p-0">
        <CardContent className="p-4 space-y-3">
          {/* Date Input */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Label className="text-sm">Date</Label>
            </div>
            <Input
              id={testId}
              type="date"
              value={currentDate}
              onChange={(e) => handleDateChange(e.target.value)}
              placeholder={placeholder}
              required={required}
              disabled={disabled}
              data-testid={testId ? `${testId}-date` : "date-input"}
              className="w-full"
            />
          </div>

          {/* Time Option Toggle */}
          {includeTime && (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={testId ? `${testId}-include-time` : "include-time"}
                  checked={includeTimeOption}
                  onCheckedChange={(checked) => handleIncludeTimeChange(checked === true)}
                  disabled={disabled}
                  data-testid={testId ? `${testId}-include-time` : "include-time"}
                />
                <Label 
                  htmlFor={testId ? `${testId}-include-time` : "include-time"}
                  className="text-sm flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Include specific time
                </Label>
              </div>

              {/* Time Input */}
              {includeTimeOption && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <Label className="text-sm">Time</Label>
                  </div>
                  <Input
                    type="time"
                    value={currentTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    disabled={disabled || !currentDate}
                    data-testid={testId ? `${testId}-time` : "time-input"}
                    className="w-full"
                  />
                </div>
              )}
            </>
          )}

          {/* Preview */}
          {currentDate && (
            <div className="pt-2 border-t">
              <Label className="text-xs text-gray-500">Preview:</Label>
              <p className="text-sm font-medium">
                {format(new Date(value || currentDate), 
                  includeTimeOption ? "EEEE, MMMM d, yyyy 'at' h:mm a" : "EEEE, MMMM d, yyyy"
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}