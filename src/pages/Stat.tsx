import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutGrid, LogOut, Users, Calculator as CalcIcon, RotateCcw, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import Calculator from "@/components/Calculator";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import SalesCharts from "@/components/SalesCharts";
import DebtorLedger from "@/components/DebtorLedger";
import { usePresence } from "@/hooks/use-presence";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const Stat = () => {
  const navigate = useNavigate();
  const { companyId, company } = useCompany();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcPosition, setCalcPosition] = useState({ x: 20, y: 100 });
  const onlineUsers = usePresence(userRole, 'stat');

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
    if (companyId) {
      fetchSalesData();
    }
  }, [companyId]);

  const fetchSalesData = async () => {
    if (!companyId) return;
    
    try {
      let query = supabase
        .from('daily_sales')
        .select(`
          *,
          pump_readings(*),
          oil_sales(*)
        `)
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false });

      if (userRole === 'Supervisor') {
        query = query.limit(15);
      }

      const { data: sales, error } = await query;

      if (error) throw error;

      const transformedData = sales?.map(sale => {
        const pumpReadings = Array.isArray(sale.pump_readings) ? sale.pump_readings : [];
        const oilSales = Array.isArray(sale.oil_sales) ? sale.oil_sales : [];

        const petrolSales = pumpReadings
          .filter((p: any) => p.pump_type === 'petrol')
          .reduce((sum: number, p: any) => sum + ((p.closing_reading - p.opening_reading) * p.price_per_litre), 0);

        const dieselSales = pumpReadings
          .filter((p: any) => p.pump_type === 'diesel')
          .reduce((sum: number, p: any) => sum + ((p.closing_reading - p.opening_reading) * p.price_per_litre), 0);

        const oilTotal = oilSales.reduce((sum: number, o: any) => {
          return sum + (o.total_amount || 0) + (o.oil_price || 0);
        }, 0);

        return {
          date: sale.sale_date,
          entryNumber: sale.entry_number || 1,
          updatedAt: sale.updated_at,
          savedBy: sale.saved_by || null,
          petrol: petrolSales,
          diesel: dieselSales,
          engineOil: oilTotal,
          lubricants: 0,
          total: sale.total_income || 0,
        };
      }) || [];

      setSalesData(transformedData);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("userRole");
    navigate("/login");
  };

  const handleGoToShortcut = () => {
    navigate("/shortcut");
  };

  const [resetConfirmText, setResetConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const handleResetAllData = async () => {
    if (!companyId || resetConfirmText !== "RESET") return;
    setIsResetting(true);
    try {
      // 1. Get all daily_sales ids
      const { data: sales } = await supabase.from("daily_sales").select("id").eq("company_id", companyId);
      const dsIds = (sales ?? []).map(s => s.id);

      if (dsIds.length) {
        // Delete child tables of daily_sales
        for (const table of ["daily_attendance", "pump_readings", "oil_sales", "payment_methods", "cash_denominations", "expenses", "debtors", "repaid_debtors"] as const) {
          await supabase.from(table).delete().in("daily_sales_id", dsIds);
        }
        // Delete daily_sales
        await supabase.from("daily_sales").delete().eq("company_id", companyId);
      }

      // 2. Delete company-level tables
      for (const table of ["storage_readings", "storage_products", "fiserv_bills", "bharat_fleet_bills", "debtor_ledger", "employees"] as const) {
        await supabase.from(table).delete().eq("company_id", companyId);
      }

      toast.success("All company data has been reset successfully");
      setResetDialogOpen(false);
      setResetConfirmText("");
      setSalesData([]);
      fetchSalesData();
    } catch (err: any) {
      console.error("Reset error:", err);
      toast.error(err.message || "Failed to reset data");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={companyLogo} alt={companyName} className="h-14 w-auto object-contain" referrerPolicy="no-referrer" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Stat</h1>
                <p className="text-sm text-muted-foreground">Sales Statistics & Reports</p>
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

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Users Online</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-primary">{onlineUsers}</div>
                  <p className="text-xs text-muted-foreground mt-1">Currently active</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" onClick={fetchSalesData} className="h-8">
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Refresh
                  </Button>
                  {userRole === "Proprietor" && (
                    <AlertDialog open={resetDialogOpen} onOpenChange={(open) => { setResetDialogOpen(open); if (!open) setResetConfirmText(""); }}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="h-8">
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Reset
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reset All Company Data?</AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <span className="block">This will permanently delete <strong>ALL</strong> data for this company including:</span>
                            <span className="block text-sm">• Daily sales entries & pump readings</span>
                            <span className="block text-sm">• Attendance, expenses, debtors</span>
                            <span className="block text-sm">• Storage readings & products</span>
                            <span className="block text-sm">• Fiserv & Bharat Fleet bills</span>
                            <span className="block text-sm">• Employees & debtor ledger</span>
                            <span className="block mt-3 font-semibold text-destructive">Type "RESET" to confirm:</span>
                          </AlertDialogDescription>
                          <Input
                            value={resetConfirmText}
                            onChange={(e) => setResetConfirmText(e.target.value)}
                            placeholder='Type "RESET" here'
                            className="mt-2"
                          />
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleResetAllData}
                            disabled={resetConfirmText !== "RESET" || isResetting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {isResetting ? "Resetting..." : "Reset All Data"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {companyId && <DebtorLedger userId={companyId} />}
        </div>

        <SalesCharts salesData={salesData} onRefresh={fetchSalesData} userRole={userRole} />
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

export default Stat;
