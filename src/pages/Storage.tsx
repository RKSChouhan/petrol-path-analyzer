import { useEffect, useState } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { LayoutGrid, LogOut, Archive, Save, Fuel, Gauge, Zap, Truck, RotateCcw, Calculator as CalcIcon } from "lucide-react";
import StorageProductList from "@/components/StorageProductList";
import Calculator from "@/components/Calculator";
import StorageOCRUpload from "@/components/StorageOCRUpload";
import { format } from "date-fns";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StorageData {
  generator_diesel_capacity: number;
  generator_dip: number;
  eb_meter: number;
  eb_unit: number;
  petrol_kl: number;
  diesel_kl: number;
  oil_reading: number;
  two_t_oil_barrel_stock: number;
  empty_barrel: number;
  tvs_xl_meter: number;
  petrol_density_value: number;
  petrol_temperature: number;
  petrol_density_at_15c: number;
  diesel_density_value: number;
  diesel_temperature: number;
  diesel_density_at_15c: number;
  load_capacity: number;
  density_checker: string;
  lorry_entry_time: string;
  lorry_exit_time: string;
  duration: string;
}

const initialData: StorageData = {
  generator_diesel_capacity: 0,
  generator_dip: 0,
  eb_meter: 0,
  eb_unit: 0,
  petrol_kl: 0,
  diesel_kl: 0,
  oil_reading: 0,
  two_t_oil_barrel_stock: 0,
  empty_barrel: 0,
  tvs_xl_meter: 0,
  petrol_density_value: 0,
  petrol_temperature: 0,
  petrol_density_at_15c: 0,
  diesel_density_value: 0,
  diesel_temperature: 0,
  diesel_density_at_15c: 0,
  load_capacity: 0,
  density_checker: '',
  lorry_entry_time: '',
  lorry_exit_time: '',
  duration: '',
};

const Storage = () => {
  const navigate = useNavigate();
  const { companyId, company } = useCompany();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [data, setData] = useState<StorageData>(initialData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedDates, setSavedDates] = useState<string[]>([]);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcPosition, setCalcPosition] = useState({ x: 20, y: 100 });

  const companyName = company?.name || "Sales Tracker";
  const companyLogo = company?.logo_url || logo;

  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.removeItem("userRole");
      supabase.auth.signOut();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      const role = sessionStorage.getItem("userRole");
      if (!role) {
        navigate("/login");
      } else {
        setUserRole(role);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem("userRole");
        navigate("/login");
      }
    });

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (companyId && selectedDate) {
      fetchData();
    }
  }, [companyId, selectedDate]);

  useEffect(() => {
    if (companyId) {
      fetchSavedDates();
    }
  }, [companyId]);

  const fetchSavedDates = async () => {
    if (!companyId) return;
    
    try {
      const { data: readings, error } = await supabase
        .from('storage_readings')
        .select('reading_date')
        .eq('company_id', companyId);

      if (error) throw error;

      const dates = readings?.map(r => r.reading_date) || [];
      setSavedDates(dates);
    } catch (error) {
      console.error('Error fetching saved dates:', error);
    }
  };

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    
    try {
      const { data: reading, error } = await supabase
        .from('storage_readings')
        .select('*')
        .eq('company_id', companyId)
        .eq('reading_date', format(selectedDate, 'yyyy-MM-dd'))
        .maybeSingle();

      if (error) throw error;

      if (reading) {
        setData({
          generator_diesel_capacity: reading.generator_diesel_capacity || 0,
          generator_dip: reading.generator_dip || 0,
          eb_meter: reading.eb_meter || 0,
          eb_unit: reading.eb_unit || 0,
          petrol_kl: reading.petrol_kl || 0,
          diesel_kl: reading.diesel_kl || 0,
          oil_reading: reading.oil_reading || 0,
          two_t_oil_barrel_stock: reading.two_t_oil_barrel_stock || 0,
          empty_barrel: reading.empty_barrel || 0,
          tvs_xl_meter: reading.tvs_xl_meter || 0,
          petrol_density_value: reading.petrol_density_value || 0,
          petrol_temperature: reading.petrol_temperature || 0,
          petrol_density_at_15c: reading.petrol_density_at_15c || 0,
          diesel_density_value: reading.diesel_density_value || 0,
          diesel_temperature: reading.diesel_temperature || 0,
          diesel_density_at_15c: reading.diesel_density_at_15c || 0,
          load_capacity: reading.load_capacity || 0,
          density_checker: reading.density_checker || '',
          lorry_entry_time: reading.lorry_entry_time || '',
          lorry_exit_time: reading.lorry_exit_time || '',
          duration: reading.duration || '',
        });
      } else {
        setData(initialData);
      }
    } catch (error) {
      console.error('Error fetching storage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Prepare data, converting empty time strings to null
      const saveData = {
        company_id: companyId,
        reading_date: dateStr,
        ...data,
        lorry_entry_time: data.lorry_entry_time || null,
        lorry_exit_time: data.lorry_exit_time || null,
      };
      
      const { error } = await supabase
        .from('storage_readings')
        .upsert(saveData, { onConflict: 'company_id,reading_date' });

      if (error) throw error;

      toast.success("Storage data saved successfully");
      // Refresh saved dates list
      if (!savedDates.includes(dateStr)) {
        setSavedDates([...savedDates, dateStr]);
      }
    } catch (error: any) {
      console.error('Error saving storage data:', error);
      toast.error(error.message || "Failed to save data");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setData(initialData);
    toast.success("Form cleared");
  };

  const updateField = (field: keyof StorageData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("userRole");
    navigate("/login");
  };

  const handleGoToShortcut = () => {
    navigate("/shortcut");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={companyLogo} alt={companyName} className="h-14 w-auto object-contain" referrerPolicy="no-referrer" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Storage</h1>
                <p className="text-sm text-muted-foreground">Fuel storage & readings management</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="icon" onClick={() => setShowCalculator(!showCalculator)}>
                <CalcIcon className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleGoToShortcut}>
                <LayoutGrid className="mr-2 h-4 w-4" />
                Shortcut
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Calendar - Compact popover style like Daily Tree */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 border-2 border-primary rounded-md bg-primary/10">
                  <span className="text-sm font-bold text-primary">{format(selectedDate, "EEEE")}</span>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      modifiers={{
                        saved: (date) => savedDates.includes(format(date, 'yyyy-MM-dd'))
                      }}
                      modifiersClassNames={{
                        saved: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      }}
                    />
                  </PopoverContent>
                </Popover>
                {savedDates.includes(format(selectedDate, 'yyyy-MM-dd')) && (
                  <span className="text-xs text-green-600 dark:text-green-400">✓ Saved</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <StorageOCRUpload
                  onDataExtracted={(extracted) => {
                    setData(prev => ({
                      ...prev,
                      generator_diesel_capacity: extracted.generator_diesel_capacity || prev.generator_diesel_capacity,
                      generator_dip: extracted.generator_dip || prev.generator_dip,
                      eb_meter: extracted.eb_meter || prev.eb_meter,
                      eb_unit: extracted.eb_unit || prev.eb_unit,
                      petrol_kl: extracted.petrol_kl || prev.petrol_kl,
                      diesel_kl: extracted.diesel_kl || prev.diesel_kl,
                      oil_reading: extracted.oil_reading || prev.oil_reading,
                      two_t_oil_barrel_stock: extracted.two_t_oil_barrel_stock || prev.two_t_oil_barrel_stock,
                      empty_barrel: extracted.empty_barrel || prev.empty_barrel,
                      tvs_xl_meter: extracted.tvs_xl_meter || prev.tvs_xl_meter,
                      petrol_density_value: extracted.petrol_density_value || prev.petrol_density_value,
                      petrol_temperature: extracted.petrol_temperature || prev.petrol_temperature,
                      petrol_density_at_15c: extracted.petrol_density_at_15c || prev.petrol_density_at_15c,
                      diesel_density_value: extracted.diesel_density_value || prev.diesel_density_value,
                      diesel_temperature: extracted.diesel_temperature || prev.diesel_temperature,
                      diesel_density_at_15c: extracted.diesel_density_at_15c || prev.diesel_density_at_15c,
                      load_capacity: extracted.load_capacity || prev.load_capacity,
                      density_checker: extracted.density_checker || prev.density_checker,
                      lorry_entry_time: extracted.lorry_entry_time || prev.lorry_entry_time,
                      lorry_exit_time: extracted.lorry_exit_time || prev.lorry_exit_time,
                      duration: extracted.duration || prev.duration,
                    }));
                  }}
                  disabled={loading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Stock List - above all other sections */}
        <StorageProductList companyId={companyId} userRole={userRole} />

        {loading ? (
          <div className="flex justify-center py-8">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <>
            {/* Generator Section */}
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Gauge className="h-5 w-5" />
                  Generator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Generator Diesel Capacity</Label>
                    <Input
                      type="number"
                      value={data.generator_diesel_capacity || ''}
                      onChange={(e) => updateField('generator_diesel_capacity', parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Generator Dip</Label>
                    <Input
                      type="number"
                      value={data.generator_dip || ''}
                      onChange={(e) => updateField('generator_dip', parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* EB Section */}
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5" />
                  EB Reading
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>EB Meter</Label>
                    <Input
                      type="number"
                      value={data.eb_meter || ''}
                      onChange={(e) => updateField('eb_meter', parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>EB Unit</Label>
                    <Input
                      type="number"
                      value={data.eb_unit || ''}
                      onChange={(e) => updateField('eb_unit', parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fuel Reading Section */}
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Fuel className="h-5 w-5" />
                  Fuel Reading
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Petrol (KL)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={data.petrol_kl || ''}
                      onChange={(e) => updateField('petrol_kl', parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0.000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Diesel (KL)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={data.diesel_kl || ''}
                      onChange={(e) => updateField('diesel_kl', parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0.000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Oil Reading</Label>
                    <Input
                      type="number"
                      value={data.oil_reading || ''}
                      onChange={(e) => updateField('oil_reading', parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>2T Oil Barrel Stock</Label>
                    <Input
                      type="number"
                      value={data.two_t_oil_barrel_stock || ''}
                      onChange={(e) => updateField('two_t_oil_barrel_stock', parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Empty Barrel</Label>
                    <Input
                      type="number"
                      value={data.empty_barrel || ''}
                      onChange={(e) => updateField('empty_barrel', parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>TVS XL Meter</Label>
                    <Input
                      type="number"
                      value={data.tvs_xl_meter || ''}
                      onChange={(e) => updateField('tvs_xl_meter', parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Density Section */}
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Density Reading</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Petrol Density */}
                <div className="p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium mb-3 text-primary">Petrol Density</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Density Value</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={data.petrol_density_value || ''}
                        onChange={(e) => updateField('petrol_density_value', parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0.0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Temperature (°C)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={data.petrol_temperature || ''}
                        onChange={(e) => updateField('petrol_temperature', parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Density@15°C</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={data.petrol_density_at_15c || ''}
                        onChange={(e) => updateField('petrol_density_at_15c', parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0.0000"
                      />
                    </div>
                  </div>
                </div>

                {/* Diesel Density */}
                <div className="p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium mb-3 text-primary">Diesel Density</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Density Value</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={data.diesel_density_value || ''}
                        onChange={(e) => updateField('diesel_density_value', parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0.0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Temperature (°C)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={data.diesel_temperature || ''}
                        onChange={(e) => updateField('diesel_temperature', parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Density@15°C</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={data.diesel_density_at_15c || ''}
                        onChange={(e) => updateField('diesel_density_at_15c', parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0.0000"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Load Detail Section */}
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Truck className="h-5 w-5" />
                  Load Detail
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Load Capacity</Label>
                    <Input
                      type="number"
                      value={data.load_capacity || ''}
                      onChange={(e) => updateField('load_capacity', parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Density Checker</Label>
                    <Input
                      type="text"
                      value={data.density_checker || ''}
                      onChange={(e) => updateField('density_checker', e.target.value)}
                      placeholder="Checker name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Lorry Entry Time</Label>
                    <Input
                      type="time"
                      value={data.lorry_entry_time}
                      onChange={(e) => updateField('lorry_entry_time', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lorry Exit Time</Label>
                    <Input
                      type="time"
                      value={data.lorry_exit_time}
                      onChange={(e) => updateField('lorry_exit_time', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Input
                      type="text"
                      value={data.duration}
                      onChange={(e) => updateField('duration', e.target.value)}
                      placeholder="e.g., 2h 30m"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 pt-4">
              <Button onClick={handleClear} variant="outline" size="lg" className="px-8">
                <RotateCcw className="mr-2 h-5 w-5" />
                Clear
              </Button>
              <Button onClick={handleSave} disabled={saving} size="lg" className="px-12">
                <Save className="mr-2 h-5 w-5" />
                {saving ? 'Saving...' : 'Save Storage Data'}
              </Button>
            </div>
          </>
        )}
      </main>

      <Calculator
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        position={calcPosition}
        onPositionChange={setCalcPosition}
      />
    </div>
  );
};

export default Storage;
