import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Wallet } from "lucide-react";

export interface PaymentGroupData {
  upi: number;
  bharat_fleet_card: number;
  fiserv: number;
  gpay: number;
  evening_locker: number;
}

interface PaymentMethodsFormProps {
  data: Record<string, PaymentGroupData>;
  onChange: (data: Record<string, PaymentGroupData>) => void;
  disabled?: boolean;
  groupCount?: number;
}

const PaymentMethodsForm = ({ data, onChange, disabled = false, groupCount = 2 }: PaymentMethodsFormProps) => {
  const handleChange = (group: string, field: keyof PaymentGroupData, value: string) => {
    onChange({
      ...data,
      [group]: {
        ...data[group],
        [field]: parseFloat(value) || 0
      }
    });
  };

  const calculateTotal = (group: PaymentGroupData) => {
    return group.upi + group.bharat_fleet_card + group.fiserv + group.gpay + group.evening_locker;
  };

  const groups = Array.from({ length: groupCount }, (_, i) => `group${i + 1}`);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        Payment Methods
      </h3>
      <div className={`grid gap-4 ${groupCount === 1 ? '' : 'md:grid-cols-2'}`}>
        {groups.map((groupKey, idx) => {
          const groupData = data[groupKey] || { upi: 0, bharat_fleet_card: 0, fiserv: 0, gpay: 0, evening_locker: 0 };
          return (
            <Card key={groupKey} className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Cashier Group {idx + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">PhonePay</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={groupData.upi === 0 ? '' : groupData.upi}
                      onChange={(e) => handleChange(groupKey, 'upi', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="h-8 text-sm"
                      placeholder="0"
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">GPay</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={groupData.gpay === 0 ? '' : groupData.gpay}
                      onChange={(e) => handleChange(groupKey, 'gpay', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="h-8 text-sm"
                      placeholder="0"
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Bharat Fleet Card</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={groupData.bharat_fleet_card === 0 ? '' : groupData.bharat_fleet_card}
                      onChange={(e) => handleChange(groupKey, 'bharat_fleet_card', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="h-8 text-sm"
                      placeholder="0"
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Fiserv</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={groupData.fiserv === 0 ? '' : groupData.fiserv}
                      onChange={(e) => handleChange(groupKey, 'fiserv', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="h-8 text-sm"
                      placeholder="0"
                      disabled={disabled}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Evening Locker</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={groupData.evening_locker === 0 ? '' : groupData.evening_locker}
                      onChange={(e) => handleChange(groupKey, 'evening_locker', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="h-8 text-sm"
                      placeholder="0"
                      disabled={disabled}
                    />
                  </div>
                </div>
                <div className="bg-primary/10 p-2 rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Online/Card</span>
                    <span className="text-lg font-bold">₹{calculateTotal(groupData).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentMethodsForm;
