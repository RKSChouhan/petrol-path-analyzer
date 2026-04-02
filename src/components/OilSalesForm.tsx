import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Container, Plus, Trash2, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Oil varieties with prices from the provided list
const DEFAULT_OIL_VARIETIES = [
  { name: "2T OIL-1/2 Ltr", price: 173.00 },
  { name: "DWATER", price: 20.00 },
  { name: "WASTE", price: 20.00 },
  { name: "HYDROL OIL-26 Ltr", price: 4800.00 },
  { name: "MAK ATF-1 Ltr", price: 338.00 },
  { name: "MG 500ml", price: 182.00 },
  { name: "MAK 4T PLUS", price: 422.00 },
  { name: "MAK GOLD -1/2 ltr", price: 144.00 },
  { name: "BRAKE OIL", price: 106.00 },
  { name: "REDI COOL -1 Ltr", price: 238.00 },
  { name: "MG -5 Ltr", price: 1339.00 },
  { name: "MAK 4T ZIPP", price: 422.00 },
  { name: "MG 20WX40 -1 Ltr", price: 360.00 },
  { name: "SCOOTY OIL-800 ml", price: 444.00 },
  { name: "TVS TRUE -900ml", price: 250.00 },
  { name: "HERO HONDA- 900ml", price: 338.00 },
  { name: "GREASE-500 Gm", price: 265.00 },
  { name: "REDI COOL -1/2 ltr", price: 134.00 },
  { name: "GEAR OIL - 1Lt", price: 319.00 },
  { name: "SPIRAL EB - 1/2 Lt", price: 134.00 },
  { name: "TVS TRUE -1 Ltr", price: 275.00 },
  { name: "MAK DIAMOND -1 ltr", price: 380.00 },
  { name: "MAK DIAMOND -1/2 ltr", price: 192.00 },
  { name: "HONDA POWER-1 Ltr", price: 404.00 },
];

interface OilItem {
  oil_name: string;
  oil_count: number;
  oil_price: number;
}

interface OilSalesData {
  items: OilItem[];
  yesterday_reading: number;
  today_reading: number;
  total_litres: number;
  total_amount: number;
  distilled_water_count: number;
  distilled_water: number;
  waste: number;
}

interface OilSalesFormProps {
  data: OilSalesData;
  onChange: (data: OilSalesData) => void;
  disabled?: boolean;
  userRole?: string | null;
}

const OilSalesForm = ({
  data,
  onChange,
  disabled = false,
  userRole,
}: OilSalesFormProps) => {
  const [deletedDefaults, setDeletedDefaults] = useState<string[]>([]);
  const [customVarieties, setCustomVarieties] = useState<{ name: string; price: number }[]>([]);
  const [showNewProductDialog, setShowNewProductDialog] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");

  const isProprietor = userRole === "Proprietor";

  const allVarieties = [
    ...DEFAULT_OIL_VARIETIES.filter(o => !deletedDefaults.includes(o.name)),
    ...customVarieties,
  ];

  const handleItemChange = (index: number, field: keyof OilItem, value: string | number) => {
    const updatedItems = [...data.items];
    
    if (field === 'oil_name') {
      const selectedOil = allVarieties.find(oil => oil.name === value);
      const unitPrice = selectedOil?.price || 0;
      const count = updatedItems[index].oil_count;
      updatedItems[index] = { ...updatedItems[index], oil_name: value as string, oil_price: unitPrice * count };
    } else if (field === 'oil_count') {
      const count = typeof value === 'string' ? parseFloat(value) || 0 : value;
      const selectedOil = allVarieties.find(oil => oil.name === updatedItems[index].oil_name);
      const unitPrice = selectedOil?.price || 0;
      updatedItems[index] = { ...updatedItems[index], oil_count: count, oil_price: unitPrice * count };
    } else if (field === 'oil_price') {
      const price = typeof value === 'string' ? parseFloat(value) || 0 : value;
      updatedItems[index] = { ...updatedItems[index], oil_price: price };
    }
    
    onChange({ ...data, items: updatedItems });
  };

  const handleChange = (field: keyof Omit<OilSalesData, 'items'>, value: string | number) => {
    const updatedData = { ...data, [field]: typeof value === 'string' ? parseFloat(value) || 0 : value };
    if (field === 'yesterday_reading' || field === 'today_reading') {
      const yesterday = field === 'yesterday_reading' ? (parseFloat(value as string) || 0) : data.yesterday_reading;
      const today = field === 'today_reading' ? (parseFloat(value as string) || 0) : data.today_reading;
      updatedData.total_litres = today - yesterday;
      updatedData.total_amount = updatedData.total_litres * 330;
    }
    onChange(updatedData);
  };

  const addOilItem = () => {
    onChange({ ...data, items: [...data.items, { oil_name: '', oil_count: 0, oil_price: 0 }] });
  };

  const removeOilItem = (index: number) => {
    if (data.items.length > 1) {
      onChange({ ...data, items: data.items.filter((_, i) => i !== index) });
    }
  };

  const handleAddNewProduct = () => {
    const name = newProductName.trim().toUpperCase();
    const price = parseFloat(newProductPrice) || 0;
    if (!name || price <= 0) return;
    if (allVarieties.find(v => v.name === name)) return;
    setCustomVarieties(prev => [...prev, { name, price }]);
    setNewProductName("");
    setNewProductPrice("");
    setShowNewProductDialog(false);
  };

  const handleDeleteVariety = (oilName: string) => {
    // Check if it's a default or custom
    if (DEFAULT_OIL_VARIETIES.find(o => o.name === oilName)) {
      setDeletedDefaults(prev => [...prev, oilName]);
    } else {
      setCustomVarieties(prev => prev.filter(v => v.name !== oilName));
    }
    // Clear any items using this variety
    const updatedItems = data.items.map(item =>
      item.oil_name === oilName ? { ...item, oil_name: '', oil_price: 0 } : item
    );
    onChange({ ...data, items: updatedItems });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Container className="h-5 w-5 text-chart-3" />
        Oil Sales
      </h3>
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">2T Oil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Today Reading</Label>
              <Input type="number" step="0.001" value={data.today_reading === 0 ? '' : data.today_reading} onChange={e => handleChange('today_reading', e.target.value)} onFocus={e => e.target.select()} className="h-9" placeholder="0" disabled={disabled} />
            </div>
            <div>
              <Label className="text-xs">Yesterday Reading</Label>
              <Input type="number" step="0.001" value={data.yesterday_reading === 0 ? '' : data.yesterday_reading} onChange={e => handleChange('yesterday_reading', e.target.value)} onFocus={e => e.target.select()} className="h-9" placeholder="0" disabled={disabled} />
            </div>
            <div>
              <Label className="text-xs">Total 2T Oil Liters</Label>
              <Input type="number" step="0.001" value={data.total_litres.toFixed(3)} readOnly disabled className="h-9 bg-muted font-semibold" />
            </div>
            <div>
              <Label className="text-xs">Total 2T Oil Amount (₹)</Label>
              <Input type="number" step="0.01" value={data.total_amount.toFixed(2)} readOnly disabled className="h-9 bg-muted font-semibold" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Engine Oil & Lubricants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.items.map((item, index) => (
              <div key={index} className="grid grid-cols-[1fr_100px_120px_40px] gap-2">
                <div>
                  <Label className="text-sm">Oil Type</Label>
                  <Select value={item.oil_name} onValueChange={(value) => handleItemChange(index, 'oil_name', value)} disabled={disabled}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select oil type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50 max-h-[300px]">
                      {allVarieties.map((oil) => (
                        <div key={oil.name} className="flex items-center">
                          <SelectItem value={oil.name} className="flex-1">
                            {oil.name} - ₹{oil.price.toFixed(2)}
                          </SelectItem>
                          {isProprietor && (
                            <button
                              type="button"
                              className="p-1 mr-2 text-destructive hover:text-destructive/80 shrink-0"
                              onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteVariety(oil.name);
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Count</Label>
                  <Input type="number" value={item.oil_count === 0 ? '' : item.oil_count} onChange={e => handleItemChange(index, 'oil_count', e.target.value)} onFocus={e => e.target.select()} className="h-9" placeholder="0" disabled={disabled} />
                </div>
                <div>
                  <Label className="text-sm">Price (₹)</Label>
                  <Input type="number" step="0.01" min="0" value={item.oil_price === 0 ? '' : item.oil_price.toFixed(2)} readOnly disabled className="h-9 font-semibold bg-muted" />
                </div>
                <div className="flex items-end">
                  {!disabled && data.items.length > 1 && (
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => removeOilItem(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!disabled && (
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={addOilItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Oil
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNewProductDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Product
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showNewProductDialog} onOpenChange={setShowNewProductDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Product Name</Label>
              <Input value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="e.g. CASTROL 1Ltr" />
            </div>
            <div>
              <Label>Price per unit (₹)</Label>
              <Input type="number" step="0.01" min="0" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProductDialog(false)}>Cancel</Button>
            <Button onClick={handleAddNewProduct} disabled={!newProductName.trim() || !newProductPrice}>Add to List</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OilSalesForm;
