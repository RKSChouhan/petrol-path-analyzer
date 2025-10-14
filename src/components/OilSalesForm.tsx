import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Container, Plus, Trash2 } from "lucide-react";
interface OilItem {
  oil_name: string;
  oil_count: number;
  oil_price: number;
}
interface OilSalesData {
  items: OilItem[];
  total_litres: number;
  total_amount: number;
  distilled_water: number;
  waste: number;
}
interface OilSalesFormProps {
  data: OilSalesData;
  onChange: (data: OilSalesData) => void;
}
const OilSalesForm = ({
  data,
  onChange
}: OilSalesFormProps) => {
  const handleItemChange = (index: number, field: keyof OilItem, value: string | number) => {
    const updatedItems = [...data.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: typeof value === 'string' ? field === 'oil_name' ? value : parseFloat(value) || 0 : value
    };
    onChange({
      ...data,
      items: updatedItems
    });
  };
  const handleChange = (field: keyof Omit<OilSalesData, 'items'>, value: string | number) => {
    const updatedData = {
      ...data,
      [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
    };

    // Auto-calculate total_amount when total_litres changes
    if (field === 'total_litres') {
      updatedData.total_amount = (parseFloat(value as string) || 0) * 330;
    }
    onChange(updatedData);
  };
  const addOilItem = () => {
    onChange({
      ...data,
      items: [...data.items, {
        oil_name: '',
        oil_count: 0,
        oil_price: 0
      }]
    });
  };
  const removeOilItem = (index: number) => {
    if (data.items.length > 1) {
      onChange({
        ...data,
        items: data.items.filter((_, i) => i !== index)
      });
    }
  };
  return <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Container className="h-5 w-5 text-chart-3" />
        Oil Sales
      </h3>
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Engine Oil & Lubricants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-4">
            {data.items.map((item, index) => <div key={index} className="grid grid-cols-[1fr_100px_120px_40px] gap-2">
                <div>
                  <Label className="text-sm">Oil Code </Label>
                  <Input type="text" value={item.oil_name} onChange={e => handleItemChange(index, 'oil_name', e.target.value)} onFocus={e => e.target.select()} className="h-9" placeholder="Enter oil name" />
                </div>
                <div>
                  <Label className="text-sm">Count</Label>
                  <Input type="number" value={item.oil_count === 0 ? '' : item.oil_count} onChange={e => handleItemChange(index, 'oil_count', e.target.value)} onFocus={e => e.target.select()} className="h-9" placeholder="0" />
                </div>
                <div>
                  <Label className="text-sm">Price (₹)</Label>
                  <Input type="number" step="0.01" value={item.oil_price === 0 ? '' : item.oil_price} onChange={e => handleItemChange(index, 'oil_price', e.target.value)} onFocus={e => e.target.select()} className="h-9" placeholder="0" />
                </div>
                <div className="flex items-end">
                  {index === 0 ? <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={addOilItem}>
                      <Plus className="h-4 w-4" />
                    </Button> : <Button type="button" variant="outline" size="icon" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => removeOilItem(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>}
                </div>
              </div>)}
          </div>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label className="text-sm">2T Oil</Label>
              <Input type="number" step="0.001" value={data.total_litres === 0 ? '' : data.total_litres} onChange={e => handleChange('total_litres', e.target.value)} onFocus={e => e.target.select()} className="h-9" placeholder="0" />
            </div>
            <div>
              <Label className="text-sm">Total Amount (₹)</Label>
              <Input type="number" step="0.01" value={data.total_amount} readOnly disabled className="h-9 bg-muted" />
            </div>
            <div>
              <Label className="text-sm">Distilled Water (₹)</Label>
              <Input type="number" step="0.01" value={data.distilled_water === 0 ? '' : data.distilled_water} onChange={e => handleChange('distilled_water', e.target.value)} onFocus={e => e.target.select()} className="h-9" placeholder="0" />
            </div>
            <div>
              <Label className="text-sm">Waste (₹)</Label>
              <Input type="number" step="0.01" value={data.waste === 0 ? '' : data.waste} onChange={e => handleChange('waste', e.target.value)} onFocus={e => e.target.select()} className="h-9" placeholder="0" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default OilSalesForm;