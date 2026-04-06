import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutGrid, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { format, parseISO } from "date-fns";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import logo from "@/assets/logo.png";

const COLORS = {
  petrol: "hsl(var(--chart-1))",
  diesel: "hsl(var(--chart-2))",
  lubricant: "hsl(var(--chart-3))",
  expense: "hsl(var(--chart-4))",
};

const Trends = () => {
  const navigate = useNavigate();
  const { companyId, company } = useCompany();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [expenseData, setExpenseData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      fetchData();
    }
  }, [companyId]);

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);

    try {
      const { data: sales, error } = await supabase
        .from('daily_sales')
        .select(`
          *,
          pump_readings(*),
          oil_sales(*),
          expenses(*)
        `)
        .eq('company_id', companyId)
        .order('sale_date', { ascending: true })
        .limit(60);

      if (error) throw error;

      // Transform sales data
      const transformedSalesData = sales?.map(sale => {
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
          date: format(parseISO(sale.sale_date), "dd MMM"),
          fullDate: sale.sale_date,
          Petrol: Math.round(petrolSales),
          Diesel: Math.round(dieselSales),
          Lubricant: Math.round(oilTotal),
          total: Math.round(petrolSales + dieselSales + oilTotal),
        };
      }) || [];

      // Transform expense data
      const expenseByDate: { [key: string]: number } = {};
      sales?.forEach(sale => {
        const expenses = Array.isArray(sale.expenses) ? sale.expenses : [];
        const totalExpense = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
        const dateKey = format(parseISO(sale.sale_date), "dd MMM");
        expenseByDate[dateKey] = (expenseByDate[dateKey] || 0) + totalExpense;
      });

      const transformedExpenseData = Object.entries(expenseByDate).map(([date, amount]) => ({
        date,
        Expense: amount,
      }));

      setSalesData(transformedSalesData);
      setExpenseData(transformedExpenseData);
    } catch (error) {
      console.error('Error fetching trend data:', error);
    } finally {
      setLoading(false);
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
                <h1 className="text-2xl font-bold text-foreground">Trends</h1>
                <p className="text-sm text-muted-foreground">Sales & Expense Trends</p>
              </div>
            </div>
            <div className="flex gap-3">
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
        {loading ? (
          <Card className="shadow-[var(--shadow-card)]">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Loading trends...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Daily Sales Trend */}
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle>Daily Sales Trend</CardTitle>
                <CardDescription>Revenue breakdown over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                      formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
                    />
                    <Legend />
                    <Bar dataKey="Petrol" fill={COLORS.petrol} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Diesel" fill={COLORS.diesel} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Lubricant" fill={COLORS.lubricant} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Total Revenue Trend */}
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle>Total Revenue Trend</CardTitle>
                <CardDescription>Combined daily sales over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                      formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Expense Trend */}
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle>Expense Trend</CardTitle>
                <CardDescription>Daily expenses over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={expenseData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                      formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
                    />
                    <Legend />
                    <Bar dataKey="Expense" fill={COLORS.expense} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Lubricant Sales Trend */}
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle>Lubricant Sales Trend</CardTitle>
                <CardDescription>Daily lubricant sales over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                      formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
                    />
                    <Legend />
                    <Bar dataKey="Lubricant" fill={COLORS.lubricant} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Trends;
