import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "lucide-react";

interface OilSalesData {
  total_litres: number;
  total_amount: number;
  distilled_water: number;
  waste: number;
  oil_name: string;
  oil_price: number;
  oil_count: number;
}

interface OilSalesFormProps {
  data: OilSalesData;
  onChange: (data: OilSalesData) => void;
}

const OilSalesForm = ({ data, onChange }: OilSalesFormProps) => {
  const handleChange = (field: keyof OilSalesData, value: string | number) => {
    const updatedData = {
      ...data,
      [field]: typeof value === 'string' ? (field === 'oil_name' ? value : parseFloat(value) || 0) : value
    };
    
    // Auto-calculate total_amount when total_litres changes
    if (field === 'total_litres') {
      updatedData.total_amount = (parseFloat(value as string) || 0) * 330;
    }
    
    onChange(updatedData);
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
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label className="text-sm">Oil Name</Label>
              <Input
                type="text"
                value={data.oil_name}
                onChange={(e) => handleChange('oil_name', e.target.value)}
                onFocus={(e) => e.target.select()}
                className="h-9"
                placeholder="Enter oil name"
              />
            </div>
            <div>
              <Label className="text-sm">Oil Count</Label>
              <Input
                type="number"
                value={data.oil_count === 0 ? '' : data.oil_count}
                onChange={(e) => handleChange('oil_count', e.target.value)}
                onFocus={(e) => e.target.select()}
                className="h-9"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-sm">Oil Price (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.oil_price === 0 ? '' : data.oil_price}
                onChange={(e) => handleChange('oil_price', e.target.value)}
                onFocus={(e) => e.target.select()}
                className="h-9"
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">2T Oil</Label>
              <Input
                type="number"
                step="0.001"
                value={data.total_litres === 0 ? '' : data.total_litres}
                onChange={(e) => handleChange('total_litres', e.target.value)}
                onFocus={(e) => e.target.select()}
                className="h-9"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-sm">Total Amount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.total_amount}
                readOnly
                disabled
                className="h-9 bg-muted"
              />
            </div>
            <div>
              <Label className="text-sm">Distilled Water (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.distilled_water === 0 ? '' : data.distilled_water}
                onChange={(e) => handleChange('distilled_water', e.target.value)}
                onFocus={(e) => e.target.select()}
                className="h-9"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-sm">Waste (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.waste === 0 ? '' : data.waste}
                onChange={(e) => handleChange('waste', e.target.value)}
                onFocus={(e) => e.target.select()}
                className="h-9"
                placeholder="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OilSalesForm;