import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fuel, Droplet } from "lucide-react";

interface PumpReading {
  opening_reading: number;
  closing_reading: number;
  price_per_litre: number;
}

interface PumpReadingsData {
  [key: string]: PumpReading;
}

interface PumpReadingsFormProps {
  data: PumpReadingsData;
  onChange: (data: PumpReadingsData) => void;
  disabled?: boolean;
  isProprietor?: boolean;
  pumpCountPetrol?: number;
  pumpCountDiesel?: number;
}

const PumpReadingsForm = ({ data, onChange, disabled = false, isProprietor = false, pumpCountPetrol = 4, pumpCountDiesel = 4 }: PumpReadingsFormProps) => {
  const handlePumpChange = (
    pumpKey: string,
    field: keyof PumpReading,
    value: string
  ) => {
    onChange({
      ...data,
      [pumpKey]: {
        ...data[pumpKey],
        [field]: parseFloat(value) || 0
      }
    });
  };

  const calculateSales = (pump: PumpReading) => {
    const litres = pump.closing_reading - pump.opening_reading;
    const amount = litres * pump.price_per_litre;
    return { litres, amount };
  };

  const renderPumpInputs = (
    pumpKey: string,
    pumpNumber: number,
    type: 'petrol' | 'diesel'
  ) => {
    const pump = data[pumpKey] || { opening_reading: 0, closing_reading: 0, price_per_litre: type === 'petrol' ? 101.88 : 93.48 };
    const sales = calculateSales(pump);
    const Icon = type === 'petrol' ? Fuel : Droplet;
    const color = type === 'petrol' ? 'text-primary' : 'text-accent';

    return (
      <Card key={pumpKey} className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} />
            {type === 'petrol' ? 'Petrol' : 'Diesel'} Pump-{pumpNumber}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Today (9:00AM)</Label>
              <Input
                type="number"
                step="0.001"
                value={pump.closing_reading === 0 ? '' : pump.closing_reading}
                onChange={(e) => handlePumpChange(pumpKey, 'closing_reading', e.target.value)}
                onFocus={(e) => e.target.select()}
                className="h-8 text-sm"
                placeholder="0"
                disabled={disabled}
              />
            </div>
            <div>
              <Label className="text-xs">Yesterday (9:00AM)</Label>
              <Input
                type="number"
                step="0.001"
                value={pump.opening_reading === 0 ? '' : pump.opening_reading}
                onChange={(e) => handlePumpChange(pumpKey, 'opening_reading', e.target.value)}
                onFocus={(e) => e.target.select()}
                className="h-8 text-sm"
                placeholder="0"
                disabled={disabled}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Price per Litre (₹)</Label>
            <Input
              type="number"
              step="0.01"
              value={pump.price_per_litre === 0 ? '' : pump.price_per_litre}
              onChange={(e) => handlePumpChange(pumpKey, 'price_per_litre', e.target.value)}
              onFocus={(e) => e.target.select()}
              className="h-8 text-sm"
              placeholder="0"
              disabled={disabled}
              readOnly={!isProprietor}
            />
          </div>
          <div className="bg-muted/50 p-2 rounded space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Sales Litres:</span>
              <span className="font-semibold">{sales.litres.toFixed(2)}L</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Sales Amount:</span>
              <span className="font-semibold">₹{sales.amount.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const petrolPumps = Array.from({ length: pumpCountPetrol }, (_, i) => i + 1);
  const dieselPumps = Array.from({ length: pumpCountDiesel }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Fuel className="h-5 w-5 text-primary" />
          Petrol Pumps Readings
        </h3>
        <div className={`grid gap-4 ${pumpCountPetrol <= 2 ? 'md:grid-cols-2' : 'md:grid-cols-4'}`}>
          {petrolPumps.map(n => renderPumpInputs(`petrol${n}`, n, 'petrol'))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Droplet className="h-5 w-5 text-accent" />
          Diesel Pumps Readings
        </h3>
        <div className={`grid gap-4 ${pumpCountDiesel <= 2 ? 'md:grid-cols-2' : 'md:grid-cols-4'}`}>
          {dieselPumps.map(n => renderPumpInputs(`diesel${n}`, n, 'diesel'))}
        </div>
      </div>
    </div>
  );
};

export default PumpReadingsForm;
