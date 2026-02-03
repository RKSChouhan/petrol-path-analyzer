import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FuelIcon, BarChart3, Flower2, Receipt, Users, Archive, LogOut, TrendingUp, Wallet } from "lucide-react";
import logo from "@/assets/logo.png";

const Shortcut = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("userRole");
    navigate("/login");
  };

  const shortcuts = [
    { name: "Daily Tree", icon: FuelIcon, path: "/", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30" },
    { name: "Fiserv Bills", icon: Receipt, path: "/fiserv-bills", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
    { name: "Stat", icon: BarChart3, path: "/stat", color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
    { name: "Lotus", icon: Flower2, path: "/lotus", color: "text-pink-600 dark:text-pink-400", bgColor: "bg-pink-100 dark:bg-pink-900/30" },
    { name: "Attendance", icon: Users, path: "/attendance", color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
    { name: "Storage", icon: Archive, path: "/storage", color: "text-cyan-600 dark:text-cyan-400", bgColor: "bg-cyan-100 dark:bg-cyan-900/30" },
    { name: "Trends", icon: TrendingUp, path: "/trends", color: "text-indigo-600 dark:text-indigo-400", bgColor: "bg-indigo-100 dark:bg-indigo-900/30" },
    { name: "Salary", icon: Wallet, path: "/salary", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Sri MahaLingam Agency" className="h-14 w-auto object-contain" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Shortcut</h1>
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
              className="shadow-[var(--shadow-card)] hover:shadow-lg transition-all cursor-pointer hover:scale-105"
              onClick={() => navigate(shortcut.path)}
            >
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
    </div>
  );
};

export default Shortcut;
