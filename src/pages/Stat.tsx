import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FuelIcon, LogOut, Users, Flower2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import SalesCharts from "@/components/SalesCharts";
import DebtorLedger from "@/components/DebtorLedger";
import logo from "@/assets/logo.png";

const Stat = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);

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

  // Track online users with Supabase Presence
  useEffect(() => {
    const channel = supabase.channel('online-users', {
      config: { presence: { key: userRole || 'anonymous' } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.values(state).flat().length;
        setOnlineUsers(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user: userRole, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole]);

  useEffect(() => {
    if (userId) {
      fetchSalesData();
    }
  }, [userId]);

  const fetchSalesData = async () => {
    if (!userId) return;
    
    try {
      let query = supabase
        .from('daily_sales')
        .select(`
          *,
          pump_readings(*),
          oil_sales(*)
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      // Supervisor sees only last 15 days, Proprietor sees all
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

        // Calculate lubricant sales: 2T oil total_amount + sum of oil_price from Engine Oil & Lubricants
        const oilTotal = oilSales.reduce((sum: number, o: any) => {
          // total_amount = 2T oil amount, oil_price = price value from Engine Oil & Lubricants
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

  const handleGoToEntry = () => {
    navigate("/");
  };

  const handleGoToLotus = () => {
    navigate("/lotus");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Sri MahaLingam Agency" className="h-14 w-auto object-contain" />
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
              <Button variant="outline" onClick={handleGoToLotus}>
                <Flower2 className="mr-2 h-4 w-4" />
                Lotus
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
        {/* Top Row: Online Users and Debtor Ledger */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Online Users Box */}
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

          {/* Debtor Ledger */}
          {userId && <DebtorLedger userId={userId} />}
        </div>

        <SalesCharts salesData={salesData} onRefresh={fetchSalesData} userRole={userRole} />
      </main>
    </div>
  );
};

export default Stat;
