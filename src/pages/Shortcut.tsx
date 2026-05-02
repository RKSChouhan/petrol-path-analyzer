import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { FuelIcon, BarChart3, Flower2, Receipt, Users, Archive, LogOut, TrendingUp, Wallet, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import logo from "@/assets/logo.png";

const Shortcut = () => {
  const navigate = useNavigate();
  const { companyId, company } = useCompany();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<{ dailyTree: boolean; storage: boolean; fiservBills: boolean }>({ dailyTree: false, storage: false, fiservBills: false });

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

  // Check for incomplete daily entries
  useEffect(() => {
    const checkIncompleteWork = async () => {
      if (!companyId) return;
      const today = format(new Date(), 'yyyy-MM-dd');

      try {
        // Check if today's daily sales entry exists
        const { data: dailySales } = await supabase
          .from('daily_sales')
          .select('id')
          .eq('company_id', companyId)
          .eq('sale_date', today)
          .limit(1);

        // Check if today's storage data exists
        const { data: storageData } = await supabase
          .from('storage_readings')
          .select('id')
          .eq('company_id', companyId)
          .eq('reading_date', today)
          .limit(1);

        // Check if today's fiserv bills exist
        const { data: fiservData } = await supabase
          .from('fiserv_bills')
          .select('id')
          .eq('company_id', companyId)
          .eq('bill_date', today)
          .limit(1);

        setAlerts({
          dailyTree: !dailySales || dailySales.length === 0,
          storage: !storageData || storageData.length === 0,
          fiservBills: !fiservData || fiservData.length === 0,
        });
      } catch (error) {
        console.error('Error checking incomplete work:', error);
      }
    };

    checkIncompleteWork();
  }, [companyId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("userRole");
    navigate("/login");
  };

  const shortcuts = [
    { name: "Daily Tree", icon: FuelIcon, path: "/", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30", alert: alerts.dailyTree },
    { name: "Bank Card Bills", icon: Receipt, path: "/fiserv-bills", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30", alert: alerts.fiservBills },
    { name: "Stat", icon: BarChart3, path: "/stat", color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/30", alert: false },
    { name: "Lotus", icon: Flower2, path: "/lotus", color: "text-pink-600 dark:text-pink-400", bgColor: "bg-pink-100 dark:bg-pink-900/30", alert: false },
    { name: "Attendance", icon: Users, path: "/attendance", color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-900/30", alert: false },
    { name: "Storage", icon: Archive, path: "/storage", color: "text-cyan-600 dark:text-cyan-400", bgColor: "bg-cyan-100 dark:bg-cyan-900/30", alert: alerts.storage },
    { name: "Trends", icon: TrendingUp, path: "/trends", color: "text-indigo-600 dark:text-indigo-400", bgColor: "bg-indigo-100 dark:bg-indigo-900/30", alert: false },
    { name: "Salary", icon: Wallet, path: "/salary", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30", alert: false },
  ];

  const hasAlerts = alerts.dailyTree || alerts.storage || alerts.fiservBills;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={companyLogo} alt={companyName} className="h-14 w-auto object-contain" referrerPolicy="no-referrer" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{companyName}</h1>
                <p className="text-sm text-muted-foreground">Quick navigation hub</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-3 max-w-4xl mx-auto">
          {shortcuts.map((shortcut) => (
            <Card 
              key={shortcut.name}
              className={`shadow-[var(--shadow-card)] hover:shadow-lg transition-all cursor-pointer hover:scale-105 relative ${
                shortcut.alert ? 'ring-2 ring-red-500 ring-offset-2' : ''
              }`}
              onClick={() => navigate(shortcut.path)}
            >
              {shortcut.alert && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              )}
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className={`p-4 rounded-full ${shortcut.bgColor} mb-4`}>
                  <shortcut.icon className={`h-8 w-8 ${shortcut.color}`} />
                </div>
                <h2 className="text-lg font-semibold text-foreground">{shortcut.name}</h2>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Floating bottom banner for incomplete tasks */}
      {hasAlerts && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-red-600 dark:bg-red-800 text-white shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3 overflow-x-auto">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 animate-pulse" />
              <span className="font-semibold flex-shrink-0">Pending:</span>
              <div className="flex items-center gap-4 text-sm">
                {alerts.dailyTree && (
                  <span className="flex items-center gap-1 cursor-pointer hover:underline flex-shrink-0" onClick={() => navigate("/")}>
                    • Daily Tree
                  </span>
                )}
                {alerts.storage && (
                  <span className="flex items-center gap-1 cursor-pointer hover:underline flex-shrink-0" onClick={() => navigate("/storage")}>
                    • Storage
                  </span>
                )}
                {alerts.fiservBills && (
                  <span className="flex items-center gap-1 cursor-pointer hover:underline flex-shrink-0" onClick={() => navigate("/fiserv-bills")}>
                    • Bank Card Bills
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shortcut;