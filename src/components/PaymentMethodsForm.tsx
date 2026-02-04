import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Wallet } from "lucide-react";

interface PaymentDataGroup1 {
  upi: number;
  bharat_fleet_card: number;
  fiserv: number;
  gpay: number;
  evening_locker: number;
}

interface PaymentDataGroup2 {
  upi: number;
  bharat_fleet_card: number;
  fiserv: number;
  phonepay: number;
  evening_locker: number;
}

interface PaymentMethodsData {
  group1: PaymentDataGroup1;
  group2: PaymentDataGroup2;
}

interface PaymentMethodsFormProps {
  data: PaymentMethodsData;
  onChange: (data: PaymentMethodsData) => void;
  disabled?: boolean;
}

const PaymentMethodsForm = ({ data, onChange, disabled = false }: PaymentMethodsFormProps) => {
  const handleChangeGroup1 = (field: keyof PaymentDataGroup1, value: string) => {
    onChange({
      ...data,
      group1: {
        ...data.group1,
        [field]: parseFloat(value) || 0
      }
    });
  };

  const handleChangeGroup2 = (field: keyof PaymentDataGroup2, value: string) => {
    onChange({
      ...data,
      group2: {
        ...data.group2,
        [field]: parseFloat(value) || 0
      }
    });
  };

  const calculateTotalGroup1 = () => {
    return data.group1.upi + data.group1.bharat_fleet_card + data.group1.fiserv + data.group1.gpay + data.group1.evening_locker;
  };

  const calculateTotalGroup2 = () => {
    return data.group2.upi + data.group2.bharat_fleet_card + data.group2.fiserv + data.group2.phonepay + data.group2.evening_locker;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        Payment Methods
      </h3>
      <div className="grid md:grid-cols-2 gap-4">
        {/* Group 1 */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Cashier Group 1 (Pumps 1&2)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">PhonePay</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={data.group1.upi === 0 ? '' : data.group1.upi}
                  onChange={(e) => handleChangeGroup1('upi', e.target.value)}
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
                  value={data.group1.gpay === 0 ? '' : data.group1.gpay}
                  onChange={(e) => handleChangeGroup1('gpay', e.target.value)}
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
                  value={data.group1.bharat_fleet_card === 0 ? '' : data.group1.bharat_fleet_card}
                  onChange={(e) => handleChangeGroup1('bharat_fleet_card', e.target.value)}
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
                  value={data.group1.fiserv === 0 ? '' : data.group1.fiserv}
                  onChange={(e) => handleChangeGroup1('fiserv', e.target.value)}
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
                  value={data.group1.evening_locker === 0 ? '' : data.group1.evening_locker}
                  onChange={(e) => handleChangeGroup1('evening_locker', e.target.value)}
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
                <span className="text-lg font-bold">₹{calculateTotalGroup1().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Group 2 */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Cashier Group 2 (Pumps 3&4)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">PhonePay</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={data.group2.upi === 0 ? '' : data.group2.upi}
                  onChange={(e) => handleChangeGroup2('upi', e.target.value)}
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
                  value={data.group2.phonepay === 0 ? '' : data.group2.phonepay}
                  onChange={(e) => handleChangeGroup2('phonepay', e.target.value)}
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
                  value={data.group2.bharat_fleet_card === 0 ? '' : data.group2.bharat_fleet_card}
                  onChange={(e) => handleChangeGroup2('bharat_fleet_card', e.target.value)}
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
                  value={data.group2.fiserv === 0 ? '' : data.group2.fiserv}
                  onChange={(e) => handleChangeGroup2('fiserv', e.target.value)}
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
                  value={data.group2.evening_locker === 0 ? '' : data.group2.evening_locker}
                  onChange={(e) => handleChangeGroup2('evening_locker', e.target.value)}
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
                <span className="text-lg font-bold">₹{calculateTotalGroup2().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentMethodsForm;