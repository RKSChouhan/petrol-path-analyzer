import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

interface DailyEntry {
  id: string;
  sale_date: string;
  entry_number: number;
  saved_by: string | null;
  updated_at: string | null;
  total_income: number | null;
  comment: string | null;
  pump_readings: any[];
  oil_sales: any[];
  payment_methods: any[];
  cash_denominations: any[];
  expenses: any[];
  debtors: any[];
  repaid_debtors: any[];
  daily_attendance: any[];
}

const Lotus = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(true);

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
        const STATION_ID = "00000000-0000-0000-0000-000000000001";
        setUserId(STATION_ID);
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
    if (userId) {
      fetchEntries();
    }
  }, [userId]);

  const fetchEntries = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('daily_sales')
        .select(`
          *,
          pump_readings(*),
          oil_sales(*),
          payment_methods(*),
          cash_denominations(*),
          expenses(*),
          debtors(*),
          repaid_debtors(*),
          daily_attendance(employee_name)
        `)
        .eq('user_id', userId)
        .order('sale_date', { ascending: false })
        .order('entry_number', { ascending: true });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast({
        title: "Error",
        description: "Failed to fetch entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("userRole");
    navigate("/login");
  };

  const handleGoBack = () => {
    navigate("/stat");
  };

  const handleExportAll = () => {
    if (entries.length === 0) return;

    const wb = XLSX.utils.book_new();
    
    // Create summary sheet with all entries in horizontal format
    const summaryData: any[][] = [
      ['LOTUS - Complete Sales Data'],
      [],
      ['Date', 'Entry', 'Saved By', 'Petrol Sales', 'Diesel Sales', 'Lubricant Sales', 'Digital Payment', 'Cash Total', 'Expenses', 'Debtors', 'Repaid', 'Total Income', 'Attendance Count'],
    ];

    entries.forEach(entry => {
      const pumpReadings = entry.pump_readings || [];
      const oilSales = entry.oil_sales || [];
      const paymentMethods = entry.payment_methods || [];
      const cashDenom = entry.cash_denominations || [];
      const expensesArr = entry.expenses || [];
      const debtorsArr = entry.debtors || [];
      const repaidArr = entry.repaid_debtors || [];
      const attendanceArr = entry.daily_attendance || [];

      const petrolSales = pumpReadings
        .filter((p: any) => p.pump_type === 'petrol')
        .reduce((sum: number, p: any) => sum + ((p.closing_reading - p.opening_reading) * p.price_per_litre), 0);
      
      const dieselSales = pumpReadings
        .filter((p: any) => p.pump_type === 'diesel')
        .reduce((sum: number, p: any) => sum + ((p.closing_reading - p.opening_reading) * p.price_per_litre), 0);

      const lubricantSales = oilSales.reduce((sum: number, o: any) => 
        sum + (o.total_amount || 0) + (o.oil_price || 0), 0);

      const digitalPayment = paymentMethods.reduce((sum: number, pm: any) => 
        sum + (pm.phone_pay || 0) + (pm.gpay || 0) + (pm.bharat_fleet_card || 0) + 
        (pm.fiserv || 0) + (pm.debit || 0) + (pm.ubi || 0) + (pm.evening_locker || 0), 0);

      const cashTotal = cashDenom.reduce((sum: number, cd: any) => 
        sum + ((cd.rs_500 || 0) * 500) + ((cd.rs_200 || 0) * 200) + ((cd.rs_100 || 0) * 100) + 
        ((cd.rs_50 || 0) * 50) + ((cd.rs_20 || 0) * 20) + ((cd.rs_10 || 0) * 10) + (cd.coins || 0), 0);

      const totalExpenses = expensesArr.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const totalDebtors = debtorsArr.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
      const totalRepaid = repaidArr.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

      summaryData.push([
        format(parseISO(entry.sale_date), "dd MMM yyyy"),
        entry.entry_number,
        entry.saved_by || '-',
        petrolSales,
        dieselSales,
        lubricantSales,
        digitalPayment,
        cashTotal,
        totalExpenses,
        totalDebtors,
        totalRepaid,
        entry.total_income || 0,
        attendanceArr.length,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    ws['!cols'] = Array(13).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');

    XLSX.writeFile(wb, `Lotus_Complete_Sales_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    
    toast({
      title: "Exported",
      description: "All entries exported to Excel",
    });
  };

  // Group entries by date
  const groupedEntries = entries.reduce((acc, entry) => {
    const date = entry.sale_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, DailyEntry[]>);

  const calculateEntryTotals = (entry: DailyEntry) => {
    const pumpReadings = entry.pump_readings || [];
    const oilSales = entry.oil_sales || [];
    const paymentMethods = entry.payment_methods || [];
    const cashDenom = entry.cash_denominations || [];
    const expensesArr = entry.expenses || [];
    const debtorsArr = entry.debtors || [];
    const repaidArr = entry.repaid_debtors || [];

    const petrolSales = pumpReadings
      .filter((p: any) => p.pump_type === 'petrol')
      .reduce((sum: number, p: any) => sum + ((p.closing_reading - p.opening_reading) * p.price_per_litre), 0);
    
    const dieselSales = pumpReadings
      .filter((p: any) => p.pump_type === 'diesel')
      .reduce((sum: number, p: any) => sum + ((p.closing_reading - p.opening_reading) * p.price_per_litre), 0);

    const lubricantSales = oilSales.reduce((sum: number, o: any) => 
      sum + (o.total_amount || 0) + (o.oil_price || 0), 0);

    const digitalPayment = paymentMethods.reduce((sum: number, pm: any) => 
      sum + (pm.phone_pay || 0) + (pm.gpay || 0) + (pm.bharat_fleet_card || 0) + 
      (pm.fiserv || 0) + (pm.debit || 0) + (pm.ubi || 0) + (pm.evening_locker || 0), 0);

    const cashTotal = cashDenom.reduce((sum: number, cd: any) => 
      sum + ((cd.rs_500 || 0) * 500) + ((cd.rs_200 || 0) * 200) + ((cd.rs_100 || 0) * 100) + 
      ((cd.rs_50 || 0) * 50) + ((cd.rs_20 || 0) * 20) + ((cd.rs_10 || 0) * 10) + (cd.coins || 0), 0);

    const totalExpenses = expensesArr.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const totalDebtors = debtorsArr.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
    const totalRepaid = repaidArr.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

    return {
      petrolSales,
      dieselSales,
      lubricantSales,
      digitalPayment,
      cashTotal,
      totalExpenses,
      totalDebtors,
      totalRepaid,
      totalIncome: entry.total_income || 0,
    };
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Sri MahaLingam Agency" className="h-14 w-auto object-contain" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Lotus</h1>
                <p className="text-sm text-muted-foreground">Complete Daily Entries View</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleExportAll}>
                <Download className="mr-2 h-4 w-4" />
                Export All
              </Button>
              <Button variant="outline" onClick={handleGoBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Stat
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
        {loading ? (
          <Card className="shadow-[var(--shadow-card)]">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Loading entries...</p>
            </CardContent>
          </Card>
        ) : entries.length === 0 ? (
          <Card className="shadow-[var(--shadow-card)]">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No entries found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Header Row */}
            <Card className="shadow-[var(--shadow-card)]">
              <CardContent className="py-3">
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex gap-4 min-w-max px-2">
                    <div className="w-28 font-semibold text-sm text-muted-foreground">Date</div>
                    <div className="w-16 font-semibold text-sm text-muted-foreground text-center">Entry</div>
                    <div className="w-24 font-semibold text-sm text-muted-foreground text-center">Saved By</div>
                    <div className="w-28 font-semibold text-sm text-muted-foreground text-right">Petrol</div>
                    <div className="w-28 font-semibold text-sm text-muted-foreground text-right">Diesel</div>
                    <div className="w-28 font-semibold text-sm text-muted-foreground text-right">Lubricant</div>
                    <div className="w-28 font-semibold text-sm text-muted-foreground text-right">Digital</div>
                    <div className="w-28 font-semibold text-sm text-muted-foreground text-right">Cash</div>
                    <div className="w-24 font-semibold text-sm text-muted-foreground text-right">Expenses</div>
                    <div className="w-24 font-semibold text-sm text-muted-foreground text-right">Debtors</div>
                    <div className="w-24 font-semibold text-sm text-muted-foreground text-right">Repaid</div>
                    <div className="w-28 font-semibold text-sm text-muted-foreground text-right">Total</div>
                    <div className="w-20 font-semibold text-sm text-muted-foreground text-center">Staff</div>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Data Rows - One per entry, horizontally scrollable */}
            {Object.keys(groupedEntries)
              .sort((a, b) => b.localeCompare(a))
              .map(date => (
                <Card key={date} className="shadow-[var(--shadow-card)]">
                  <CardContent className="py-2">
                    {groupedEntries[date].map((entry, idx) => {
                      const totals = calculateEntryTotals(entry);
                      const isFirst = idx === 0;
                      
                      return (
                        <ScrollArea key={entry.id} className={`w-full whitespace-nowrap ${idx > 0 ? 'mt-2 pt-2 border-t' : ''}`}>
                          <div className="flex gap-4 min-w-max px-2 py-1 items-center hover:bg-muted/50 rounded">
                            <div className="w-28 font-medium text-sm">
                              {isFirst ? format(parseISO(date), "dd MMM yyyy") : ''}
                            </div>
                            <div className="w-16 text-center">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                {entry.entry_number}
                              </span>
                            </div>
                            <div className="w-24 text-center">
                              {entry.saved_by ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  entry.saved_by === 'Proprietor' 
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                }`}>
                                  {entry.saved_by === 'Proprietor' ? 'P' : 'S'}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </div>
                            <div className="w-28 text-right text-sm font-medium text-chart-1">
                              ₹{totals.petrolSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </div>
                            <div className="w-28 text-right text-sm font-medium text-chart-2">
                              ₹{totals.dieselSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </div>
                            <div className="w-28 text-right text-sm font-medium text-chart-3">
                              ₹{totals.lubricantSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </div>
                            <div className="w-28 text-right text-sm">
                              ₹{totals.digitalPayment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </div>
                            <div className="w-28 text-right text-sm">
                              ₹{totals.cashTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </div>
                            <div className="w-24 text-right text-sm text-orange-600 dark:text-orange-400">
                              ₹{totals.totalExpenses.toLocaleString('en-IN')}
                            </div>
                            <div className="w-24 text-right text-sm text-red-600 dark:text-red-400">
                              ₹{totals.totalDebtors.toLocaleString('en-IN')}
                            </div>
                            <div className="w-24 text-right text-sm text-green-600 dark:text-green-400">
                              ₹{totals.totalRepaid.toLocaleString('en-IN')}
                            </div>
                            <div className="w-28 text-right text-sm font-bold">
                              ₹{totals.totalIncome.toLocaleString('en-IN')}
                            </div>
                            <div className="w-20 text-center text-sm">
                              {(entry.daily_attendance || []).length}
                            </div>
                          </div>
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Lotus;