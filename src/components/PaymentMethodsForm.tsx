import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Wallet } from "lucide-react";

interface PaymentData {
  upi: number;
  bharat_fleet_card: number;
  fiserv: number;
  debit: number;
  ubi: number;
  evening_locker: number;
  cash_on_hand: number;
}

interface PaymentMethodsData {
  group1: PaymentData;
  group2: PaymentData;
}

interface PaymentMethodsFormProps {
  data: PaymentMethodsData;
  onChange: (data: PaymentMethodsData) => void;
}

const PaymentMethodsForm = ({ data, onChange }: PaymentMethodsFormProps) => {
  const handleChange = (
    group: keyof PaymentMethodsData,
    field: keyof PaymentData,
    value: string
  ) => {
    onChange({
      ...data,
      [group]: {
        ...data[group],
        [field]: parseFloat(value) || 0
      }
    });
  };

  const calculateTotal = (payments: PaymentData) => {
    return Object.values(payments).reduce((sum, val) => sum + val, 0);
  };

  const renderPaymentInputs = (group: keyof PaymentMethodsData, title: string, icon: React.ReactNode) => {
    const payments = data[group];
    const total = calculateTotal(payments);

    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">UPI (PhonePay/GPay)</Label>
              <Input
                type="number"
                step="0.01"
                value={payments.upi}
                onChange={(e) => handleChange(group, 'upi', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Bharat Fleet Card</Label>
              <Input
                type="number"
                step="0.01"
                value={payments.bharat_fleet_card}
                onChange={(e) => handleChange(group, 'bharat_fleet_card', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Fiserv</Label>
              <Input
                type="number"
                step="0.01"
                value={payments.fiserv}
                onChange={(e) => handleChange(group, 'fiserv', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Debit</Label>
              <Input
                type="number"
                step="0.01"
                value={payments.debit}
                onChange={(e) => handleChange(group, 'debit', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">UBI</Label>
              <Input
                type="number"
                step="0.01"
                value={payments.ubi}
                onChange={(e) => handleChange(group, 'ubi', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Evening Locker</Label>
              <Input
                type="number"
                step="0.01"
                value={payments.evening_locker}
                onChange={(e) => handleChange(group, 'evening_locker', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Cash on Hand</Label>
              <Input
                type="number"
                step="0.01"
                value={payments.cash_on_hand}
                onChange={(e) => handleChange(group, 'cash_on_hand', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="bg-primary/10 p-2 rounded">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Online/Card</span>
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
        <CreditCard className="h-5 w-5 text-primary" />
        Payment Methods
      </h3>
      <div className="grid md:grid-cols-2 gap-4">
        {renderPaymentInputs('group1', 'Cashier Group 1 (Pumps 1&2)', <Wallet className="h-4 w-4" />)}
        {renderPaymentInputs('group2', 'Cashier Group 2 (Pumps 3&4)', <Wallet className="h-4 w-4" />)}
      </div>
    </div>
  );
};

export default PaymentMethodsForm;