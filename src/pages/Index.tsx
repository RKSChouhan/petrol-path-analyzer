import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import SalesCharts from "@/components/SalesCharts";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    total_litres: 0,
    total_amount: 0,
    distilled_water: 0,
    waste: 0,
    oil_name: '',
    oil_price: 0,
    oil_count: 0,
  });

  const [showCashTotal, setShowCashTotal] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
    } else {
      setUserId(session.user.id);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const calculateTotalIncome = () => {
    let total = 0;
    
    // Pump sales
    Object.values(pumpReadings).forEach(pump => {
      total += (pump.closing_reading - pump.opening_reading) * pump.price_per_litre;
    });
    
    // Oil sales
    total += oilSales.total_amount + oilSales.distilled_water + oilSales.oil_price;
    
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

  const handleSaveData = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const totalIncome = calculateTotalIncome();

      // Insert or update daily_sales
      const { data: dailySales, error: salesError } = await supabase
        .from('daily_sales')
        .upsert({
          user_id: userId,
          sale_date: dateStr,
          total_income: totalIncome,
          total_expenses: 0,
        }, { onConflict: 'sale_date' })
        .select()
        .single();

      if (salesError) throw salesError;

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
        { daily_sales_id: dailySales.id, cashier_group: 'group1', phone_pay: paymentMethods.group1.upi, gpay: 0, ...paymentMethods.group1 },
        { daily_sales_id: dailySales.id, cashier_group: 'group2', phone_pay: paymentMethods.group2.upi, gpay: 0, ...paymentMethods.group2 },
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
      const { error: oilError } = await supabase.from('oil_sales').insert({
        daily_sales_id: dailySales.id,
        ...oilSales,
      });
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FuelIcon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Petrol Pump Manager</h1>
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
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-3 mb-8">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Fuel Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {Object.values(pumpReadings).reduce((sum, p) => sum + (p.closing_reading - p.opening_reading), 0).toFixed(2)}L
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total litres sold</p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Oil Sales</CardTitle>
              <BarChart3 className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">₹{oilSales.total_amount.toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground mt-1">{oilSales.total_litres.toFixed(2)}L sold</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="entry" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="entry">Daily Entry</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="entry" className="space-y-6">
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle>Daily Sales Entry</CardTitle>
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
                  <Button variant="outline" size="lg">Clear All</Button>
                  <Button size="lg" onClick={handleSaveData} disabled={loading}>
                    {loading ? "Saving..." : "Save Sales Data"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4">
            <SalesCharts salesData={[]} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
