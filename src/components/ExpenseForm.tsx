import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IndianRupee } from "lucide-react";

interface ExpenseFormProps {
  value: number;
  onChange: (value: number) => void;
}

const ExpenseForm = ({ value, onChange }: ExpenseFormProps) => {
  return (
    <Card className="shadow-sm border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-950/10 dark:border-orange-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-orange-600 dark:text-orange-400">
          <IndianRupee className="h-5 w-5" />
          Expense
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="expense-amount" className="text-sm text-muted-foreground">Amount</Label>
          <Input
            id="expense-amount"
            type="number"
            value={value || ""}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="text-lg font-semibold"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseForm;
