import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutGrid, LogOut, Users, Calculator as CalcIcon } from "lucide-react";
import Calculator from "@/components/Calculator";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import SalesCharts from "@/components/SalesCharts";
import DebtorLedger from "@/components/DebtorLedger";
import { usePresence } from "@/hooks/use-presence";
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
              <div className="text-3xl font-bold text-primary">{onlineUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">Currently active</p>
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
