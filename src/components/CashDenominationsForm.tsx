import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Banknote } from "lucide-react";

export interface CashData {
  rs_500: number;
  rs_200: number;
  rs_100: number;
  rs_50: number;
  rs_20: number;
  rs_10: number;
  coins: number;
}

interface CashDenominationsFormProps {
  data: Record<string, CashData>;
  onChange: (data: Record<string, CashData>) => void;
  disabled?: boolean;
  groupCount?: number;
}

const CashDenominationsForm = ({ data, onChange, disabled = false, groupCount = 2 }: CashDenominationsFormProps) => {
  const handleChange = (
    group: string,
    field: keyof CashData,
    value: string
  ) => {
    onChange({
      ...data,
      [group]: {
        ...data[group],
        [field]: field === 'coins' ? (parseFloat(value) || 0) : (parseInt(value) || 0)
      }
    });
  };

  const calculateTotal = (cash: CashData) => {
    return (
      cash.rs_500 * 500 +
      cash.rs_200 * 200 +
      cash.rs_100 * 100 +
      cash.rs_50 * 50 +
      cash.rs_20 * 20 +
      cash.rs_10 * 10 +
      cash.coins
    );
  };

  const groups = Array.from({ length: groupCount }, (_, i) => `group${i + 1}`);

  const renderCashInputs = (groupKey: string, idx: number) => {
    const cash = data[groupKey] || { rs_500: 0, rs_200: 0, rs_100: 0, rs_50: 0, rs_20: 0, rs_10: 0, coins: 0 };
    const total = calculateTotal(cash);

    return (
      <Card key={groupKey} className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="h-4 w-4" />
            Cashier Group {idx + 1}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">₹500 Notes</Label>
              <Input type="number" value={cash.rs_500 === 0 ? '' : cash.rs_500} onChange={(e) => handleChange(groupKey, 'rs_500', e.target.value)} onFocus={(e) => e.target.select()} className="h-8 text-sm" placeholder="0" disabled={disabled} />
            </div>
            <div>
              <Label className="text-xs">₹200 Notes</Label>
              <Input type="number" value={cash.rs_200 === 0 ? '' : cash.rs_200} onChange={(e) => handleChange(groupKey, 'rs_200', e.target.value)} onFocus={(e) => e.target.select()} className="h-8 text-sm" placeholder="0" disabled={disabled} />
            </div>
            <div>
              <Label className="text-xs">₹100 Notes</Label>
              <Input type="number" value={cash.rs_100 === 0 ? '' : cash.rs_100} onChange={(e) => handleChange(groupKey, 'rs_100', e.target.value)} onFocus={(e) => e.target.select()} className="h-8 text-sm" placeholder="0" disabled={disabled} />
            </div>
            <div>
              <Label className="text-xs">₹50 Notes</Label>
              <Input type="number" value={cash.rs_50 === 0 ? '' : cash.rs_50} onChange={(e) => handleChange(groupKey, 'rs_50', e.target.value)} onFocus={(e) => e.target.select()} className="h-8 text-sm" placeholder="0" disabled={disabled} />
            </div>
            <div>
              <Label className="text-xs">₹20 Notes</Label>
              <Input type="number" value={cash.rs_20 === 0 ? '' : cash.rs_20} onChange={(e) => handleChange(groupKey, 'rs_20', e.target.value)} onFocus={(e) => e.target.select()} className="h-8 text-sm" placeholder="0" disabled={disabled} />
            </div>
            <div>
              <Label className="text-xs">₹10 Notes</Label>
              <Input type="number" value={cash.rs_10 === 0 ? '' : cash.rs_10} onChange={(e) => handleChange(groupKey, 'rs_10', e.target.value)} onFocus={(e) => e.target.select()} className="h-8 text-sm" placeholder="0" disabled={disabled} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Coins (₹)</Label>
            <Input type="number" step="0.01" value={cash.coins === 0 ? '' : cash.coins} onChange={(e) => handleChange(groupKey, 'coins', e.target.value)} onFocus={(e) => e.target.select()} className="h-8 text-sm" placeholder="0" disabled={disabled} />
          </div>
          <div className="bg-accent/10 p-2 rounded">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Cash</span>
              <span className="text-lg font-bold">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Banknote className="h-5 w-5 text-accent" />
        Cash Denominations
      </h3>
      <div className={`grid gap-4 ${groupCount === 1 ? '' : 'md:grid-cols-2'}`}>
        {groups.map((groupKey, idx) => renderCashInputs(groupKey, idx))}
      </div>
    </div>
  );
};

export default CashDenominationsForm;
