import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, FuelIcon, BarChart3, TrendingUp, IndianRupee } from "lucide-react";
import { format } from "date-fns";
import SalesEntryForm from "@/components/SalesEntryForm";
import SalesCharts from "@/components/SalesCharts";
import { cn } from "@/lib/utils";

export interface SalesData {
  date: string;
  petrol: number;
  diesel: number;
  engineOil: number;
  lubricants: number;
}

const Index = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [salesData, setSalesData] = useState<SalesData[]>(() => {
    const stored = localStorage.getItem("pumpSalesData");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem("pumpSalesData", JSON.stringify(salesData));
  }, [salesData]);

  const handleSalesSubmit = (data: Omit<SalesData, "date">) => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const existingIndex = salesData.findIndex(s => s.date === dateStr);
    
    if (existingIndex >= 0) {
      const updated = [...salesData];
      updated[existingIndex] = { date: dateStr, ...data };
      setSalesData(updated);
    } else {
      setSalesData([...salesData, { date: dateStr, ...data }]);
    }
  };

  const todayData = salesData.find(s => s.date === format(selectedDate, "yyyy-MM-dd"));
  const totalRevenue = todayData 
    ? todayData.petrol + todayData.diesel + todayData.engineOil + todayData.lubricants 
    : 0;

  const yearTotal = salesData.reduce((sum, day) => 
    sum + day.petrol + day.diesel + day.engineOil + day.lubricants, 0
  );

  const avgDailySales = salesData.length > 0 ? yearTotal / salesData.length : 0;

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
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="shadow-[var(--shadow-card)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">₹{totalRevenue.toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {format(selectedDate, "dd MMM yyyy")}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Yearly Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">₹{yearTotal.toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {salesData.length} days recorded
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Daily Average</CardTitle>
              <BarChart3 className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">₹{Math.round(avgDailySales).toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all recorded days
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="entry" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="entry">Sales Entry</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="entry" className="space-y-4">
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle>Record Daily Sales</CardTitle>
                <CardDescription>
                  Enter sales data for {format(selectedDate, "dd MMMM yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SalesEntryForm 
                  onSubmit={handleSalesSubmit}
                  initialData={todayData}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4">
            <SalesCharts salesData={salesData} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
