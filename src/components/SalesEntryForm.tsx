import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fuel, Droplet, Container, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SalesData } from "@/pages/Index";

interface SalesEntryFormProps {
  onSubmit: (data: Omit<SalesData, "date">) => void;
  initialData?: SalesData;
}

const SalesEntryForm = ({ onSubmit, initialData }: SalesEntryFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    petrol: initialData?.petrol || 0,
    diesel: initialData?.diesel || 0,
    engineOil: initialData?.engineOil || 0,
    lubricants: initialData?.lubricants || 0,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        petrol: initialData.petrol,
        diesel: initialData.diesel,
        engineOil: initialData.engineOil,
        lubricants: initialData.lubricants,
      });
    } else {
      setFormData({
        petrol: 0,
        diesel: 0,
        engineOil: 0,
        lubricants: 0,
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    toast({
      title: "Sales Recorded",
      description: "Daily sales data has been saved successfully.",
    });
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const products = [
    { name: "petrol", label: "Petrol Sales", icon: Fuel, color: "text-primary" },
    { name: "diesel", label: "Diesel Sales", icon: Droplet, color: "text-accent" },
    { name: "engineOil", label: "Engine Oil Sales", icon: Container, color: "text-chart-3" },
    { name: "lubricants", label: "Lubricants Sales", icon: Wrench, color: "text-chart-4" },
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {products.map(({ name, label, icon: Icon, color }) => (
          <div key={name} className="space-y-2">
            <Label htmlFor={name} className="flex items-center gap-2 text-base">
              <Icon className={`h-5 w-5 ${color}`} />
              {label}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
              <Input
                id={name}
                type="number"
                step="0.01"
                min="0"
                value={formData[name]}
                onChange={(e) => handleChange(name, e.target.value)}
                className="pl-8 text-lg font-semibold"
                placeholder="0.00"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => setFormData({ petrol: 0, diesel: 0, engineOil: 0, lubricants: 0 })}
        >
          Clear
        </Button>
        <Button type="submit" className="bg-[var(--gradient-primary)]">
          Save Sales Data
        </Button>
      </div>
    </form>
  );
};

export default SalesEntryForm;
