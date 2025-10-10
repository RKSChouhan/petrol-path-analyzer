import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "lucide-react";

interface OilSalesData {
  total_litres: number;
  total_amount: number;
  distilled_water: number;
  waste: number;
}

interface OilSalesFormProps {
  data: OilSalesData;
  onChange: (data: OilSalesData) => void;
}

const OilSalesForm = ({ data, onChange }: OilSalesFormProps) => {
  const handleChange = (field: keyof OilSalesData, value: string) => {
    onChange({
      ...data,
      [field]: parseFloat(value) || 0
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Container className="h-5 w-5 text-chart-3" />
        Oil Sales
      </h3>
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Engine Oil & Lubricants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Total Litres</Label>
              <Input
                type="number"
                step="0.001"
                value={data.total_litres}
                onChange={(e) => handleChange('total_litres', e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-sm">Total Amount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.total_amount}
                onChange={(e) => handleChange('total_amount', e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-sm">Distilled Water (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.distilled_water}
                onChange={(e) => handleChange('distilled_water', e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-sm">Waste (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.waste}
                onChange={(e) => handleChange('waste', e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OilSalesForm;