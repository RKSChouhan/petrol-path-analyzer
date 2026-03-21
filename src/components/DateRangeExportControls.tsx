import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateRangeExportControlsProps {
  endDate?: Date;
  onEndDateChange: (date?: Date) => void;
  onExport: () => void;
  startDate?: Date;
  onStartDateChange: (date?: Date) => void;
  disabled?: boolean;
}

const DatePickerField = ({
  date,
  label,
  onChange,
}: {
  date?: Date;
  label: string;
  onChange: (date?: Date) => void;
}) => (
  <div className="space-y-2">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd MMM yyyy") : "Select date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onChange}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  </div>
);

const DateRangeExportControls = ({
  endDate,
  onEndDateChange,
  onExport,
  startDate,
  onStartDateChange,
  disabled,
}: DateRangeExportControlsProps) => {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-end">
      <div className="grid flex-1 gap-3 sm:grid-cols-2">
        <DatePickerField label="From" date={startDate} onChange={onStartDateChange} />
        <DatePickerField label="To" date={endDate} onChange={onEndDateChange} />
      </div>
      <Button onClick={onExport} disabled={disabled} className="sm:self-end">
        Export Selected Range
      </Button>
    </div>
  );
};

export default DateRangeExportControls;