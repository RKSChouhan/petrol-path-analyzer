import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CalendarIcon, FuelIcon, BarChart3, TrendingUp, IndianRupee, LogOut, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import PumpReadingsForm from "@/components/PumpReadingsForm";
import PaymentMethodsForm from "@/components/PaymentMethodsForm";
import CashDenominationsForm from "@/components/CashDenominationsForm";
import OilSalesForm from "@/components/OilSalesForm";
import EmptyFieldsDialog from "@/components/EmptyFieldsDialog";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emptyFieldsDialogOpen, setEmptyFieldsDialogOpen] = useState(false);
  const [emptyFields, setEmptyFields] = useState<string[]>([]);

  // Form states
  const [pumpReadings, setPumpReadings] = useState({
    petrol1: { opening_reading: 0, closing_reading: 0, price_per_litre: 101.88 },
    petrol2: { opening_reading: 0, closing_reading: 0, price_per_litre: 101.88 },
    petrol3: { opening_reading: 0, closing_reading: 0, price_per_litre: 101.88 },
    petrol4: { opening_reading: 0, closing_reading: 0, price_per_litre: 101.88 },
    diesel1: { opening_reading: 0, closing_reading: 0, price_per_litre: 93.48 },
    diesel2: { opening_reading: 0, closing_reading: 0, price_per_litre: 93.48 },
    diesel3: { opening_reading: 0, closing_reading: 0, price_per_litre: 93.48 },
    diesel4: { opening_reading: 0, closing_reading: 0, price_per_litre: 93.48 },
  });

  const [paymentMethods, setPaymentMethods] = useState({
    group1: { upi: 0, bharat_fleet_card: 0, fiserv: 0, debit: 0, ubi: 0, evening_locker: 0 },
    group2: { upi: 0, bharat_fleet_card: 0, fiserv: 0, debit: 0, ubi: 0, evening_locker: 0 },
  });

  const [cashDenominations, setCashDenominations] = useState({
    group1: { rs_500: 0, rs_200: 0, rs_100: 0, rs_50: 0, rs_20: 0, rs_10: 0, coins: 0 },
    group2: { rs_500: 0, rs_200: 0, rs_100: 0, rs_50: 0, rs_20: 0, rs_10: 0, coins: 0 },
  });

  const [oilSales, setOilSales] = useState({
    items: [
      {
        oil_name: '',
        oil_count: 0,
        oil_price: 0,
      }
    ],
    yesterday_reading: 0,
    today_reading: 0,
    total_litres: 0,
    total_amount: 0,
    distilled_water: 0,
    waste: 0,
  });

  const [showCashTotal, setShowCashTotal] = useState(false);

  useEffect(() => {
    // Sign out on page close/refresh
    const handleBeforeUnload = () => {
      sessionStorage.removeItem("userRole");
      supabase.auth.signOut();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    const checkAuth = async () => {
      // Check for Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      // Check for role in sessionStorage
      const role = sessionStorage.getItem("userRole");
      if (!role) {
        navigate("/login");
      } else {
        setUserRole(role);
        // Use a fixed UUID so all devices share the same data
        const STATION_ID = "00000000-0000-0000-0000-000000000001";
        setUserId(STATION_ID);
      }
    };

    checkAuth();

    // Listen for auth changes
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
    if (userId) {
      checkAndResetForNewDay();
    }
  }, [userId, selectedDate]);

  const checkAndResetForNewDay = async () => {
    if (!userId) return;
    
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      // Check if data exists for selected date
      const { data: existingData } = await supabase
        .from('daily_sales')
        .select('id, pump_readings(*), oil_sales(*), payment_methods(*), cash_denominations(*)')
        .eq('user_id', userId)
        .eq('sale_date', dateStr)
        .maybeSingle();

      if (existingData) {
        // Load existing data for editing
        // This will be handled by existing logic
        return;
      }

      // No data exists for this date - fetch previous day's closing readings and reset form
      const previousDate = new Date(selectedDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDateStr = format(previousDate, "yyyy-MM-dd");

      const { data: previousSales } = await supabase
        .from('daily_sales')
        .select('id, pump_readings(*)')
        .eq('user_id', userId)
        .eq('sale_date', previousDateStr)
        .maybeSingle();

      const newPumpReadings = {
        petrol1: { opening_reading: 0, closing_reading: 0, price_per_litre: 101.88 },
        petrol2: { opening_reading: 0, closing_reading: 0, price_per_litre: 101.88 },
        petrol3: { opening_reading: 0, closing_reading: 0, price_per_litre: 101.88 },
        petrol4: { opening_reading: 0, closing_reading: 0, price_per_litre: 101.88 },
        diesel1: { opening_reading: 0, closing_reading: 0, price_per_litre: 93.48 },
        diesel2: { opening_reading: 0, closing_reading: 0, price_per_litre: 93.48 },
        diesel3: { opening_reading: 0, closing_reading: 0, price_per_litre: 93.48 },
        diesel4: { opening_reading: 0, closing_reading: 0, price_per_litre: 93.48 },
      };

      // Auto-populate opening readings from previous day's closing readings
      if (previousSales?.pump_readings) {
        const previousReadings = previousSales.pump_readings || [];
        previousReadings.forEach((reading: any) => {
          const key = `${reading.pump_type}${reading.pump_number}` as keyof typeof newPumpReadings;
          if (newPumpReadings[key]) {
            newPumpReadings[key] = {
              ...newPumpReadings[key],
              opening_reading: reading.closing_reading,
            };
          }
        });
      }

      // Reset all form fields to zero for new day
      setPumpReadings(newPumpReadings);
      setPaymentMethods({
        group1: { upi: 0, bharat_fleet_card: 0, fiserv: 0, debit: 0, ubi: 0, evening_locker: 0 },
        group2: { upi: 0, bharat_fleet_card: 0, fiserv: 0, debit: 0, ubi: 0, evening_locker: 0 },
      });
      setCashDenominations({
        group1: { rs_500: 0, rs_200: 0, rs_100: 0, rs_50: 0, rs_20: 0, rs_10: 0, coins: 0 },
        group2: { rs_500: 0, rs_200: 0, rs_100: 0, rs_50: 0, rs_20: 0, rs_10: 0, coins: 0 },
      });
      setOilSales({
        items: [{ oil_name: '', oil_count: 0, oil_price: 0 }],
        yesterday_reading: 0,
        today_reading: 0,
        total_litres: 0,
        total_amount: 0,
        distilled_water: 0,
        waste: 0,
      });
    } catch (error) {
      console.error('Error checking/resetting for new day:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("userRole");
    navigate("/login");
  };

  const handleGoToStat = () => {
    navigate("/stat");
  };

  const calculateTotalIncome = () => {
    let total = 0;
    
    // Pump sales
    Object.values(pumpReadings).forEach(pump => {
      total += (pump.closing_reading - pump.opening_reading) * pump.price_per_litre;
    });
    
    // Oil sales
    const oilPricesTotal = oilSales.items.reduce((sum, item) => sum + (item.oil_count * item.oil_price), 0);
    total += oilSales.total_amount + oilSales.distilled_water + oilSales.waste + oilPricesTotal;
    
    return total;
  };

  const calculateTotalCashInHand = () => {
    const calculateGroupTotal = (group: typeof cashDenominations.group1) => {
      return (
        group.rs_500 * 500 +
        group.rs_200 * 200 +
        group.rs_100 * 100 +
        group.rs_50 * 50 +
        group.rs_20 * 20 +
        group.rs_10 * 10 +
        group.coins
      );
    };
    
    const group1Total = calculateGroupTotal(cashDenominations.group1);
    const group2Total = calculateGroupTotal(cashDenominations.group2);
    
    return group1Total + group2Total;
  };

  const calculateTotalDigitalPayments = () => {
    const group1Total = 
      paymentMethods.group1.upi +
      paymentMethods.group1.bharat_fleet_card +
      paymentMethods.group1.fiserv +
      paymentMethods.group1.debit +
      paymentMethods.group1.ubi +
      paymentMethods.group1.evening_locker;
    
    const group2Total = 
      paymentMethods.group2.upi +
      paymentMethods.group2.bharat_fleet_card +
      paymentMethods.group2.fiserv +
      paymentMethods.group2.debit +
      paymentMethods.group2.ubi +
      paymentMethods.group2.evening_locker;
    
    return group1Total + group2Total;
  };

  const calculateMustBe = () => {
    return calculateTotalIncome() - calculateTotalDigitalPayments();
  };

  const calculateShortage = () => {
    return calculateMustBe() - calculateTotalCashInHand();
  };

  const handleClearAll = () => {
    setPumpReadings({
      petrol1: { opening_reading: 0, closing_reading: 0, price_per_litre: 101.88 },
      petrol2: { opening_reading: 0, closing_reading: 0, price_per_litre: 101.88 },
      petrol3: { opening_reading: 0, closing_reading: 0, price_per_litre: 101.88 },
      petrol4: { opening_reading: 0, closing_reading: 0, price_per_litre: 101.88 },
      diesel1: { opening_reading: 0, closing_reading: 0, price_per_litre: 93.48 },
      diesel2: { opening_reading: 0, closing_reading: 0, price_per_litre: 93.48 },
      diesel3: { opening_reading: 0, closing_reading: 0, price_per_litre: 93.48 },
      diesel4: { opening_reading: 0, closing_reading: 0, price_per_litre: 93.48 },
    });
    setPaymentMethods({
      group1: { upi: 0, bharat_fleet_card: 0, fiserv: 0, debit: 0, ubi: 0, evening_locker: 0 },
      group2: { upi: 0, bharat_fleet_card: 0, fiserv: 0, debit: 0, ubi: 0, evening_locker: 0 },
    });
    setCashDenominations({
      group1: { rs_500: 0, rs_200: 0, rs_100: 0, rs_50: 0, rs_20: 0, rs_10: 0, coins: 0 },
      group2: { rs_500: 0, rs_200: 0, rs_100: 0, rs_50: 0, rs_20: 0, rs_10: 0, coins: 0 },
    });
    setOilSales({
      items: [{ oil_name: '', oil_count: 0, oil_price: 0 }],
      yesterday_reading: 0,
      today_reading: 0,
      total_litres: 0,
      total_amount: 0,
      distilled_water: 0,
      waste: 0,
    });
    toast({
      title: "Cleared",
      description: "All form fields have been reset",
    });
  };

  const handleSaveData = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const totalIncome = calculateTotalIncome();

      // Check if record exists for this date
      const { data: existingRecord } = await supabase
        .from('daily_sales')
        .select('id')
        .eq('user_id', userId)
        .eq('sale_date', dateStr)
        .maybeSingle();

      let dailySales;
      
      if (existingRecord) {
        // Update existing record
        const { data, error: updateError } = await supabase
          .from('daily_sales')
          .update({
            total_income: totalIncome,
            total_expenses: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRecord.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('Update error:', updateError);
          throw updateError;
        }
        dailySales = data;
      } else {
        // Insert new record
        const { data, error: insertError } = await supabase
          .from('daily_sales')
          .insert({
            user_id: userId,
            sale_date: dateStr,
            total_income: totalIncome,
            total_expenses: 0,
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
        dailySales = data;
      }

      // Save pump readings
      const pumpData = [];
      const pumpKeys = Object.keys(pumpReadings) as Array<keyof typeof pumpReadings>;
      for (const key of pumpKeys) {
        const pump = pumpReadings[key];
        const pumpType = key.startsWith('petrol') ? 'petrol' : 'diesel';
        const pumpNumber = parseInt(key.replace(/\D/g, ''));
        
        pumpData.push({
          daily_sales_id: dailySales.id,
          pump_type: pumpType,
          pump_number: pumpNumber,
          opening_reading: pump.opening_reading,
          closing_reading: pump.closing_reading,
          price_per_litre: pump.price_per_litre,
        });
      }

      await supabase.from('pump_readings').delete().eq('daily_sales_id', dailySales.id);
      const { error: pumpError } = await supabase.from('pump_readings').insert(pumpData);
      if (pumpError) throw pumpError;

      // Save payment methods (map upi to phone_pay for backward compatibility)
      await supabase.from('payment_methods').delete().eq('daily_sales_id', dailySales.id);
      const { error: paymentError } = await supabase.from('payment_methods').insert([
        { 
          daily_sales_id: dailySales.id, 
          cashier_group: 'group1', 
          phone_pay: paymentMethods.group1.upi, 
          gpay: 0, 
          bharat_fleet_card: paymentMethods.group1.bharat_fleet_card,
          fiserv: paymentMethods.group1.fiserv,
          debit: paymentMethods.group1.debit,
          ubi: paymentMethods.group1.ubi,
          evening_locker: paymentMethods.group1.evening_locker,
          cash_on_hand: 0
        },
        { 
          daily_sales_id: dailySales.id, 
          cashier_group: 'group2', 
          phone_pay: paymentMethods.group2.upi, 
          gpay: 0, 
          bharat_fleet_card: paymentMethods.group2.bharat_fleet_card,
          fiserv: paymentMethods.group2.fiserv,
          debit: paymentMethods.group2.debit,
          ubi: paymentMethods.group2.ubi,
          evening_locker: paymentMethods.group2.evening_locker,
          cash_on_hand: 0
        },
      ]);
      if (paymentError) throw paymentError;

      // Save cash denominations
      await supabase.from('cash_denominations').delete().eq('daily_sales_id', dailySales.id);
      const { error: cashError } = await supabase.from('cash_denominations').insert([
        { daily_sales_id: dailySales.id, cashier_group: 'group1', ...cashDenominations.group1 },
        { daily_sales_id: dailySales.id, cashier_group: 'group2', ...cashDenominations.group2 },
      ]);
      if (cashError) throw cashError;

      // Save oil sales
      await supabase.from('oil_sales').delete().eq('daily_sales_id', dailySales.id);
      const oilSalesData = oilSales.items.map(item => ({
        daily_sales_id: dailySales.id,
        oil_name: item.oil_name,
        oil_count: item.oil_count,
        oil_price: item.oil_price,
        yesterday_reading: oilSales.yesterday_reading,
        today_reading: oilSales.today_reading,
        total_litres: oilSales.total_litres,
        total_amount: oilSales.total_amount,
        distilled_water: oilSales.distilled_water,
        waste: oilSales.waste,
      }));
      const { error: oilError } = await supabase.from('oil_sales').insert(oilSalesData);
      if (oilError) throw oilError;

      toast({
        title: "Success",
        description: "Daily sales data saved successfully",
      });
    } catch (error) {
      console.error('Error saving data:', error);
      toast({
        title: "Error",
        description: "Failed to save sales data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkEmptyFields = (): string[] => {
    const empty: string[] = [];
    
    // Check pump readings
    const pumpKeys = Object.keys(pumpReadings) as Array<keyof typeof pumpReadings>;
    for (const key of pumpKeys) {
      const pump = pumpReadings[key];
      const pumpName = key.replace(/(\d)/, ' $1').replace('petrol', 'Petrol').replace('diesel', 'Diesel');
      if (pump.opening_reading === 0) empty.push(`${pumpName} - Opening Reading`);
      if (pump.closing_reading === 0) empty.push(`${pumpName} - Closing Reading`);
    }
    
    // Check oil sales
    if (oilSales.yesterday_reading === 0) empty.push("Oil Sales - Yesterday Reading");
    if (oilSales.today_reading === 0) empty.push("Oil Sales - Today Reading");
    
    // Check payment methods
    const paymentLabels: Record<string, string> = {
      upi: "UPI",
      bharat_fleet_card: "Bharat Fleet Card",
      fiserv: "Fiserv",
      debit: "Debit",
      ubi: "UBI",
      evening_locker: "Evening Locker"
    };
    
    (["group1", "group2"] as const).forEach((group) => {
      const groupLabel = group === "group1" ? "Group 1" : "Group 2";
      Object.entries(paymentMethods[group]).forEach(([key, value]) => {
        if (value === 0 && paymentLabels[key]) {
          empty.push(`Payment ${groupLabel} - ${paymentLabels[key]}`);
        }
      });
    });
    
    // Check cash denominations
    const denomLabels: Record<string, string> = {
      rs_500: "₹500 Notes",
      rs_200: "₹200 Notes",
      rs_100: "₹100 Notes",
      rs_50: "₹50 Notes",
      rs_20: "₹20 Notes",
      rs_10: "₹10 Notes",
      coins: "Coins"
    };
    
    (["group1", "group2"] as const).forEach((group) => {
      const groupLabel = group === "group1" ? "Group 1" : "Group 2";
      Object.entries(cashDenominations[group]).forEach(([key, value]) => {
        if (value === 0 && denomLabels[key]) {
          empty.push(`Cash ${groupLabel} - ${denomLabels[key]}`);
        }
      });
    });
    
    return empty;
  };

  const handleSaveButtonClick = () => {
    const empty = checkEmptyFields();
    if (empty.length > 0) {
      setEmptyFields(empty);
      setEmptyFieldsDialogOpen(true);
    } else {
      handleSaveData();
    }
  };

  const handleSaveAnyway = () => {
    setEmptyFieldsDialogOpen(false);
    handleSaveData();
  };

  return (
    <div className="min-h-screen bg-background">
      <EmptyFieldsDialog
        open={emptyFieldsDialogOpen}
        onOpenChange={setEmptyFieldsDialogOpen}
        emptyFields={emptyFields}
        onSave={handleSaveAnyway}
      />
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FuelIcon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Daily tree</h1>
                <p className="text-sm text-muted-foreground">Digital Sales Tracking System</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" onClick={handleGoToStat}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Stat
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card className="shadow-[var(--shadow-card)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Income</CardTitle>
              <IndianRupee className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">₹{calculateTotalIncome().toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {format(selectedDate, "dd MMM yyyy")}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Petrol in litres</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {(['petrol1', 'petrol2', 'petrol3', 'petrol4'] as const).reduce((sum, key) => sum + (pumpReadings[key].closing_reading - pumpReadings[key].opening_reading), 0).toFixed(2)}L
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total petrol sold</p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Diesel in litres</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {(['diesel1', 'diesel2', 'diesel3', 'diesel4'] as const).reduce((sum, key) => sum + (pumpReadings[key].closing_reading - pumpReadings[key].opening_reading), 0).toFixed(2)}L
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total diesel sold</p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Oil Sales</CardTitle>
              <BarChart3 className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                ₹{(oilSales.total_amount + oilSales.items.reduce((sum, item) => sum + (item.oil_count * item.oil_price), 0)).toLocaleString('en-IN')}
              </div>
              <div className="space-y-1 mt-2">
                <p className="text-xs text-muted-foreground">{oilSales.total_litres.toFixed(2)}L sold</p>
                {oilSales.items.filter(item => item.oil_name || item.oil_count > 0 || item.oil_price > 0).map((item, index) => (
                  <p key={index} className="text-xs text-muted-foreground">
                    {item.oil_name || `Oil ${index + 1}`}: ₹{(item.oil_count * item.oil_price).toLocaleString('en-IN')}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle>Daily Ntee</CardTitle>
            <CardDescription>
              Enter complete sales data for {format(selectedDate, "dd MMMM yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <PumpReadingsForm data={pumpReadings} onChange={setPumpReadings} />
            <OilSalesForm data={oilSales} onChange={setOilSales} />
            <PaymentMethodsForm data={paymentMethods} onChange={setPaymentMethods} />
            <CashDenominationsForm data={cashDenominations} onChange={setCashDenominations} />
            
            {/* Total Income Summary */}
            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-primary" />
                Total Income Summary
              </h3>
              <Card className="shadow-sm bg-primary/5">
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-card rounded-lg relative">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm text-muted-foreground">Total Cash in Cashier Hand</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCashTotal(!showCashTotal)}
                          className="h-7 px-2"
                        >
                          {showCashTotal ? "Hide" : "Show"}
                        </Button>
                      </div>
                      <div className="text-2xl font-bold mt-2">
                        {showCashTotal ? (
                          `₹${calculateTotalCashInHand().toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        ) : (
                          <span className="blur-sm select-none">₹1,234.56</span>
                        )}
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute bottom-2 right-2 h-6 w-6 p-0"
                          >
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64" align="end">
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs text-muted-foreground">Must be</Label>
                              <div className="text-lg font-semibold">
                                ₹{calculateMustBe().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Shortage</Label>
                              <div className={cn(
                                "text-lg font-semibold",
                                calculateShortage() < 0 ? "text-green-600" : calculateShortage() > 0 ? "text-red-600" : ""
                              )}>
                                ₹{calculateShortage().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="p-4 bg-card rounded-lg">
                      <Label className="text-sm text-muted-foreground">Total Income Produced</Label>
                      <div className="text-2xl font-bold mt-2 text-primary">₹{calculateTotalIncome().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" size="lg" onClick={handleClearAll}>Clear All</Button>
              <Button size="lg" onClick={handleSaveButtonClick} disabled={loading}>
                {loading ? "Saving..." : "Save Sales Data"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Index;
