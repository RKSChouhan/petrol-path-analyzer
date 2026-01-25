import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { IndianRupee, Plus, Trash2 } from "lucide-react";

interface ExpenseItem {
  name: string;
  amount: number;
}

interface ExpenseFormProps {
  items: ExpenseItem[];
  onChange: (items: ExpenseItem[]) => void;
  disabled?: boolean;
}

const FIXED_EXPENSE_NAMES = ["Density test", "food & tea", "Drinking water"] as const;
const isFixedExpense = (name: string) => FIXED_EXPENSE_NAMES.includes(name as any);

const ExpenseForm = ({ items, onChange, disabled = false }: ExpenseFormProps) => {
  const handleAdd = () => {
    onChange([...items, { name: "", amount: 0 }]);
  };

  const handleDelete = (index: number) => {
    // Prevent deleting fixed rows
    if (isFixedExpense(items[index]?.name || "")) return;

    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems.length > 0 ? newItems : [{ name: "", amount: 0 }]);
  };

  const handleChange = (index: number, field: keyof ExpenseItem, value: string | number) => {
    const newItems = [...items];

    if (field === "name") {
      // Fixed names should remain unchanged
      if (isFixedExpense(newItems[index].name)) return;
      newItems[index].name = value as string;
    } else {
      newItems[index].amount = parseFloat(value as string) || 0;
    }

    onChange(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  return (
    <Card className="shadow-sm border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-950/10 dark:border-orange-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <IndianRupee className="h-5 w-5" />
            Expense
          </CardTitle>
          {!disabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdd}
              className="h-8 px-2 border-orange-300 text-orange-600 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/30"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => {
          const fixed = isFixedExpense(item.name);

          return (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleChange(index, "name", e.target.value)}
                  placeholder="Expense name"
                  className="h-9"
                  disabled={disabled || fixed}
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
                  className="h-9 w-9 p-0 text-orange-500 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}

        <div className="pt-3 border-t border-orange-200 dark:border-orange-800">
          <div className="flex justify-between items-center">
            <Label className="text-sm text-muted-foreground">Total</Label>
            <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
              ₹{calculateTotal().toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseForm;
