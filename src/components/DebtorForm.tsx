import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { IndianRupee, Plus, Trash2, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DebtorItem {
  name: string;
  bill_number: string;
  amount: number;
}

interface Employee {
  id: string;
  name: string;
}

interface DebtorFormProps {
  items: DebtorItem[];
  onChange: (items: DebtorItem[]) => void;
  disabled?: boolean;
  employees?: Employee[];
}

const FIXED_DEBTOR_NAMES = ["Pandian"] as const;
const isFixedDebtor = (name: string) => FIXED_DEBTOR_NAMES.includes(name as any);

const DebtorForm = ({ items, onChange, disabled = false, employees = [] }: DebtorFormProps) => {
  const handleAdd = () => {
    onChange([...items, { name: "", bill_number: "", amount: 0 }]);
  };

  const handleDelete = (index: number) => {
    // Prevent deleting fixed rows
    if (isFixedDebtor(items[index]?.name || "")) return;
    
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems.length > 0 ? newItems : [{ name: "", bill_number: "", amount: 0 }]);
  };

  // Helper to capitalize first letter and lowercase rest
  const formatName = (name: string) => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  const handleChange = (index: number, field: keyof DebtorItem, value: string | number) => {
    const newItems = [...items];
    if (field === "name") {
      // Fixed names should remain unchanged
      if (isFixedDebtor(newItems[index].name)) return;
      newItems[index].name = formatName(value as string);
    } else if (field === "bill_number") {
      newItems[index].bill_number = value as string;
    } else {
      newItems[index].amount = parseFloat(value as string) || 0;
    }
    onChange(newItems);
  };

  const handleSelectEmployee = (index: number, employeeName: string) => {
    if (isFixedDebtor(items[index].name)) return;
    const newItems = [...items];
    newItems[index].name = formatName(employeeName);
    onChange(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  return (
    <Card className="shadow-sm border-2 border-red-200 bg-red-50/50 dark:bg-red-950/10 dark:border-red-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-red-600 dark:text-red-400">
            <IndianRupee className="h-5 w-5" />
            Debtor
          </CardTitle>
          {!disabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdd}
              className="h-8 px-2 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => {
          const fixed = isFixedDebtor(item.name);
          
          return (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Name</Label>
                {fixed ? (
                  <Input
                    type="text"
                    value={item.name}
                    className="h-9"
                    disabled
                  />
                ) : employees.length > 0 ? (
                  item.name === 'OTHER_MANUAL' || (item.name && !employees.find(emp => formatName(emp.name) === item.name) && item.name !== '') ? (
                    <Input
                      type="text"
                      value={item.name === 'OTHER_MANUAL' ? '' : item.name}
                      onChange={(e) => handleChange(index, "name", e.target.value)}
                      placeholder="Enter debtor name"
                      className="h-9"
                      disabled={disabled}
                    />
                  ) : (
                    <Select
                      value={item.name}
                      onValueChange={(value) => {
                        if (value === 'OTHER_MANUAL') {
                          const newItems = [...items];
                          newItems[index].name = 'OTHER_MANUAL';
                          onChange(newItems);
                        } else {
                          handleSelectEmployee(index, value);
                        }
                      }}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select or type name" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.name}>
                            {formatName(emp.name)}
                          </SelectItem>
                        ))}
                        <SelectItem value="OTHER_MANUAL" className="border-t mt-1 pt-1">
                          Other (Manual Entry)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )
                ) : (
                  <Input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleChange(index, "name", e.target.value)}
                    placeholder="Debtor name"
                    className="h-9"
                    disabled={disabled}
                  />
                )}
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs text-muted-foreground">Bill No.</Label>
                <Input
                  type="text"
                  value={item.bill_number}
                  onChange={(e) => handleChange(index, "bill_number", e.target.value)}
                  placeholder="Bill #"
                  className="h-9"
                  disabled={disabled}
                />
              </div>
              <div className="w-28 space-y-1">
                <Label className="text-xs text-muted-foreground">Amount</Label>
                <Input
                  type="number"
                  value={item.amount || ""}
                  onChange={(e) => handleChange(index, "amount", e.target.value)}
                  placeholder="0"
                  className="h-9"
                  disabled={disabled}
                />
              </div>
              {!disabled && !fixed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(index)}
                  className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
        <div className="pt-3 border-t border-red-200 dark:border-red-800">
          <div className="flex justify-between items-center">
            <Label className="text-sm text-muted-foreground">Total</Label>
            <span className="text-lg font-bold text-red-600 dark:text-red-400">
              ₹{calculateTotal().toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DebtorForm;
