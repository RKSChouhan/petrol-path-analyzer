import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FuelIcon, LogOut, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import SalesCharts from "@/components/SalesCharts";

const Stat = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<any[]>([]);

  useEffect(() => {
    const role = sessionStorage.getItem("userRole");
    if (!role) {
      navigate("/login");
    } else {
      setUserRole(role);
      // Use the same UUID stored in localStorage
      let storedUserId = localStorage.getItem("localUserId");
      if (!storedUserId) {
        storedUserId = crypto.randomUUID();
        localStorage.setItem("localUserId", storedUserId);
      }
      setUserId(storedUserId);
    }
  }, [navigate]);

  useEffect(() => {
    if (userId) {
      fetchSalesData();
    }
  }, [userId]);

  const fetchSalesData = async () => {
    if (!userId) return;
    
    try {
      const { data: sales, error } = await supabase
        .from('daily_sales')
        .select(`
          *,
          pump_readings(*),
          oil_sales(*)
        `)
        .eq('user_id', userId)
        .order('sale_date', { ascending: false })
        .limit(30);

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

        const oilTotal = oilSales.reduce((sum: number, o: any) => 
          sum + (o.total_amount || 0), 0);

        return {
          date: sale.sale_date,
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

  const handleLogout = () => {
    sessionStorage.removeItem("userRole");
    navigate("/login");
  };

  const handleGoToEntry = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Stat</h1>
                <p className="text-sm text-muted-foreground">Sales Statistics & Reports</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleGoToEntry}>
                <FuelIcon className="mr-2 h-4 w-4" />
                Daily tree
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
        <SalesCharts salesData={salesData} onRefresh={fetchSalesData} />
      </main>
    </div>
  );
};

export default Stat;
