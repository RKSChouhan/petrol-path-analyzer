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
  petrol1: PumpReading;
  petrol2: PumpReading;
  petrol3: PumpReading;
  petrol4: PumpReading;
  diesel1: PumpReading;
  diesel2: PumpReading;
  diesel3: PumpReading;
  diesel4: PumpReading;
}

interface PumpReadingsFormProps {
  data: PumpReadingsData;
  onChange: (data: PumpReadingsData) => void;
}

const PumpReadingsForm = ({ data, onChange }: PumpReadingsFormProps) => {
  const handlePumpChange = (
    pumpKey: keyof PumpReadingsData,
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
    pumpKey: keyof PumpReadingsData,
    pumpNumber: number,
    type: 'petrol' | 'diesel'
  ) => {
    const pump = data[pumpKey];
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
              <Label className="text-xs">Opening (09:00 AM)</Label>
              <Input
                type="number"
                step="0.001"
                value={pump.opening_reading}
                onChange={(e) => handlePumpChange(pumpKey, 'opening_reading', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Closing (09:00 AM)</Label>
              <Input
                type="number"
                step="0.001"
                value={pump.closing_reading}
                onChange={(e) => handlePumpChange(pumpKey, 'closing_reading', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Price per Litre (₹)</Label>
            <Input
              type="number"
              step="0.01"
              value={pump.price_per_litre}
              onChange={(e) => handlePumpChange(pumpKey, 'price_per_litre', e.target.value)}
              className="h-8 text-sm"
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Fuel className="h-5 w-5 text-primary" />
          Petrol Pumps Readings
        </h3>
        <div className="grid md:grid-cols-4 gap-4">
          {renderPumpInputs('petrol1', 1, 'petrol')}
          {renderPumpInputs('petrol2', 2, 'petrol')}
          {renderPumpInputs('petrol3', 3, 'petrol')}
          {renderPumpInputs('petrol4', 4, 'petrol')}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Droplet className="h-5 w-5 text-accent" />
          Diesel Pumps Readings
        </h3>
        <div className="grid md:grid-cols-4 gap-4">
          {renderPumpInputs('diesel1', 1, 'diesel')}
          {renderPumpInputs('diesel2', 2, 'diesel')}
          {renderPumpInputs('diesel3', 3, 'diesel')}
          {renderPumpInputs('diesel4', 4, 'diesel')}
        </div>
      </div>
    </div>
  );
};

export default PumpReadingsForm;