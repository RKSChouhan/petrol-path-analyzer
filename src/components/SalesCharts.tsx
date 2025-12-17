import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Trash2, Download, ArrowUpDown, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SalesChartsProps {
  salesData: any[];
  onRefresh?: () => void;
  userRole?: string | null;
}

const COLORS = {
  petrol: "hsl(var(--chart-1))",
  diesel: "hsl(var(--chart-2))",
  engineOil: "hsl(var(--chart-3))",
  lubricants: "hsl(var(--chart-4))",
};

const SalesCharts = ({ salesData, onRefresh, userRole }: SalesChartsProps) => {
  const { toast, dismiss } = useToast();
  const [sortOrder, setSortOrder] = useState<'new-to-old' | 'old-to-new' | 'edited'>('new-to-old');
  const [pendingDelete, setPendingDelete] = useState<{ date: string; entryNumber: number } | null>(null);
  const deleteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | null>(null);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);
  
  const getSortedData = () => {
    const data = [...salesData];
    if (sortOrder === 'new-to-old') {
      return data.sort((a, b) => b.date.localeCompare(a.date) || (b.entryNumber || 1) - (a.entryNumber || 1));
    } else if (sortOrder === 'old-to-new') {
      return data.sort((a, b) => a.date.localeCompare(b.date) || (a.entryNumber || 1) - (b.entryNumber || 1));
    }
    // 'edited' - sort by most recently updated first (already sorted from fetch)
    return data.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  };
  
  const sortedData = getSortedData();

  const executeDelete = async (date: string, entryNumber: number) => {
    try {
      const { error } = await supabase
        .from('daily_sales')
        .delete()
        .eq('sale_date', date)
        .eq('entry_number', entryNumber);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: `Entry ${entryNumber} for ${format(parseISO(date), "dd MMM yyyy")} deleted`,
      });
      
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast({
        title: "Error",
        description: "Failed to delete record",
        variant: "destructive",
      });
    }
    setPendingDelete(null);
  };

  const handleUndo = () => {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    if (toastIdRef.current) {
      dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
    setPendingDelete(null);
    toast({
      title: "Undo successful",
      description: "Delete cancelled",
    });
  };

  const handleDelete = (date: string, entryNumber: number) => {
    // Cancel any existing pending delete
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
    }
    if (toastIdRef.current) {
      dismiss(toastIdRef.current);
    }

    setPendingDelete({ date, entryNumber });

    // Show toast with undo button
    const { id } = toast({
      title: "Deleting...",
      description: (
        <div className="flex items-center justify-between gap-4">
          <span>Entry {entryNumber} will be deleted in 10 seconds</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleUndo}
            className="shrink-0"
          >
            <Undo2 className="mr-1 h-3 w-3" />
            Undo
          </Button>
        </div>
      ),
      duration: 10000,
    });
    toastIdRef.current = id;

    // Set timer for actual delete
    deleteTimerRef.current = setTimeout(() => {
      executeDelete(date, entryNumber);
      toastIdRef.current = null;
      deleteTimerRef.current = null;
    }, 10000);
  };

  const handleExportSingleDate = async (date: string, entryNumber: number) => {
    try {
      // Fetch detailed data for specific date and entry
      const { data: sale, error } = await supabase
        .from('daily_sales')
        .select('*, pump_readings(*), oil_sales(*), payment_methods(*), cash_denominations(*)')
        .eq('sale_date', date)
        .eq('entry_number', entryNumber)
        .maybeSingle();

      if (error) throw error;
      if (!sale) {
        toast({
          title: "Error",
          description: "No data found for this entry",
          variant: "destructive",
        });
        return;
      }

      const pumpReadings = sale.pump_readings || [];
      const oilSalesArray = sale.oil_sales || [];
      const paymentMethods = sale.payment_methods || [];
      const cashDenom = sale.cash_denominations || [];

      // Calculate total oil sales values
      const totalOilAmount = oilSalesArray.reduce((sum: number, oil: any) => sum + (oil.total_amount || 0), 0);
      const totalOilLitres = oilSalesArray.reduce((sum: number, oil: any) => sum + (oil.total_litres || 0), 0);
      const totalDistilledWater = oilSalesArray.reduce((sum: number, oil: any) => sum + (oil.distilled_water || 0), 0);
      const totalWaste = oilSalesArray.reduce((sum: number, oil: any) => sum + (oil.waste || 0), 0);

      // Create detailed rows similar to the Excel format
      const detailData = [
        [`DAILY SALES REPORT - ${format(parseISO(date), "dd MMM yyyy")} (Entry ${entryNumber})`],
        [],
        ['PUMP READINGS'],
        ['Pump', 'Type', 'Opening Reading (9:00 AM)', 'Closing Reading', 'Sales in Litres', 'Price per Litre', 'Sales Amount'],
        ...pumpReadings.map((p: any) => [
          `${p.pump_type.toUpperCase()} PUMP-${p.pump_number}`,
          p.pump_type.toUpperCase(),
          p.opening_reading,
          p.closing_reading,
          p.sales_litres,
          `₹${p.price_per_litre}`,
          `₹${p.sales_amount}`
        ]),
        [],
        ['OIL SALES'],
        ['Oil Name', 'Count', 'Price', '2T Oil Yesterday', '2T Oil Today', 'Total Oil Litres', 'Total Amount', 'Distilled Water', 'Waste'],
        ...(oilSalesArray.length > 0 
          ? oilSalesArray.map((oil: any) => [
              oil.oil_name || '-',
              oil.oil_count || 0,
              `₹${oil.oil_price || 0}`,
              oil.yesterday_reading || 0,
              oil.today_reading || 0,
              oil.total_litres || 0,
              `₹${oil.total_amount || 0}`,
              oil.distilled_water || 0,
              oil.waste || 0
            ])
          : [['-', 0, '₹0', 0, 0, 0, '₹0', 0, 0]]
        ),
        [],
        ['TOTALS', '', '', '', '', totalOilLitres, `₹${totalOilAmount}`, totalDistilledWater, totalWaste],
        [],
        ['PAYMENT METHODS'],
        ['Cashier Group', 'Phone Pay', 'GPay', 'Bharat Fleet Card', 'Fiserv', 'Debit', 'UBI', 'Evening Locker', 'Cash on Hand'],
        ...paymentMethods.map((pm: any) => [
          pm.cashier_group.toUpperCase(),
          `₹${pm.phone_pay || 0}`,
          `₹${pm.gpay || 0}`,
          `₹${pm.bharat_fleet_card || 0}`,
          `₹${pm.fiserv || 0}`,
          `₹${pm.debit || 0}`,
          `₹${pm.ubi || 0}`,
          `₹${pm.evening_locker || 0}`,
          `₹${pm.cash_on_hand || 0}`
        ]),
        [],
        ['CASH DENOMINATIONS'],
        ['Cashier Group', '₹10 Notes', '₹20 Notes', '₹50 Notes', '₹100 Notes', '₹200 Notes', '₹500 Notes', 'Coins (₹)', 'Total Cash'],
        ...cashDenom.map((cd: any) => [
          cd.cashier_group.toUpperCase(),
          cd.rs_10 || 0,
          cd.rs_20 || 0,
          cd.rs_50 || 0,
          cd.rs_100 || 0,
          cd.rs_200 || 0,
          cd.rs_500 || 0,
          `₹${cd.coins || 0}`,
          `₹${cd.total_cash || 0}`
        ]),
        [],
        ['SUMMARY'],
        ['Total Income', `₹${sale.total_income}`],
        ['Total Expenses', `₹${sale.total_expenses}`],
      ];

      const ws = XLSX.utils.aoa_to_sheet(detailData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${format(parseISO(date), "dd-MMM-yyyy")}_E${entryNumber}`);

      // Generate Excel file and trigger download
      XLSX.writeFile(wb, `Daily_Sales_${format(parseISO(date), "dd-MMM-yyyy")}_Entry${entryNumber}.xlsx`);
      
      toast({
        title: "Success",
        description: `Entry ${entryNumber} for ${format(parseISO(date), "dd MMM yyyy")} exported successfully`,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Error",
        description: "Failed to export to Excel",
        variant: "destructive",
      });
    }
  };

  const handleExportToExcel = async () => {
    try {
      // Fetch detailed data with all related information
      const { data: detailedSales, error } = await supabase
        .from('daily_sales')
        .select('*, pump_readings(*), oil_sales(*), payment_methods(*), cash_denominations(*)')
        .order('sale_date', { ascending: false });

      if (error) throw error;

      const wb = XLSX.utils.book_new();

      // Create a sheet for each date's detailed data
      detailedSales?.forEach((sale: any) => {
        const date = format(parseISO(sale.sale_date), "dd-MMM-yyyy");
        
        const pumpReadings = sale.pump_readings || [];
        const oilSalesArray = sale.oil_sales || [];
        const paymentMethods = sale.payment_methods || [];
        const cashDenom = sale.cash_denominations || [];

        // Calculate total oil sales values
        const totalOilAmount = oilSalesArray.reduce((sum: number, oil: any) => sum + (oil.total_amount || 0), 0);
        const totalOilLitres = oilSalesArray.reduce((sum: number, oil: any) => sum + (oil.total_litres || 0), 0);
        const totalDistilledWater = oilSalesArray.reduce((sum: number, oil: any) => sum + (oil.distilled_water || 0), 0);
        const totalWaste = oilSalesArray.reduce((sum: number, oil: any) => sum + (oil.waste || 0), 0);

        const detailData = [
          ['DAILY SALES REPORT - ' + date],
          [],
          ['PUMP READINGS'],
          ['Pump', 'Type', 'Opening Reading (9:00 AM)', 'Closing Reading', 'Sales in Litres', 'Price per Litre', 'Sales Amount'],
          ...pumpReadings.map((p: any) => [
            `${p.pump_type.toUpperCase()} PUMP-${p.pump_number}`,
            p.pump_type.toUpperCase(),
            p.opening_reading,
            p.closing_reading,
            p.sales_litres,
            `₹${p.price_per_litre}`,
            `₹${p.sales_amount}`
          ]),
          [],
          ['OIL SALES'],
          ['Oil Name', 'Count', 'Price', '2T Oil Yesterday', '2T Oil Today', 'Total Oil Litres', 'Total Amount', 'Distilled Water', 'Waste'],
          ...(oilSalesArray.length > 0 
            ? oilSalesArray.map((oil: any) => [
                oil.oil_name || '-',
                oil.oil_count || 0,
                `₹${oil.oil_price || 0}`,
                oil.yesterday_reading || 0,
                oil.today_reading || 0,
                oil.total_litres || 0,
                `₹${oil.total_amount || 0}`,
                oil.distilled_water || 0,
                oil.waste || 0
              ])
            : [['-', 0, '₹0', 0, 0, 0, '₹0', 0, 0]]
          ),
          [],
          ['TOTALS', '', '', '', '', totalOilLitres, `₹${totalOilAmount}`, totalDistilledWater, totalWaste],
          [],
          ['PAYMENT METHODS'],
          ['Cashier Group', 'Phone Pay', 'GPay', 'Bharat Fleet Card', 'Fiserv', 'Debit', 'UBI', 'Evening Locker', 'Cash on Hand'],
          ...paymentMethods.map((pm: any) => [
            pm.cashier_group.toUpperCase(),
            `₹${pm.phone_pay || 0}`,
            `₹${pm.gpay || 0}`,
            `₹${pm.bharat_fleet_card || 0}`,
            `₹${pm.fiserv || 0}`,
            `₹${pm.debit || 0}`,
            `₹${pm.ubi || 0}`,
            `₹${pm.evening_locker || 0}`,
            `₹${pm.cash_on_hand || 0}`
          ]),
          [],
          ['CASH DENOMINATIONS'],
          ['Cashier Group', '₹10 Notes', '₹20 Notes', '₹50 Notes', '₹100 Notes', '₹200 Notes', '₹500 Notes', 'Coins (₹)', 'Total Cash'],
          ...cashDenom.map((cd: any) => [
            cd.cashier_group.toUpperCase(),
            cd.rs_10 || 0,
            cd.rs_20 || 0,
            cd.rs_50 || 0,
            cd.rs_100 || 0,
            cd.rs_200 || 0,
            cd.rs_500 || 0,
            `₹${cd.coins || 0}`,
            `₹${cd.total_cash || 0}`
          ]),
          [],
          ['SUMMARY'],
          ['Total Income', `₹${sale.total_income}`],
          ['Total Expenses', `₹${sale.total_expenses}`],
        ];

        const ws = XLSX.utils.aoa_to_sheet(detailData);
        XLSX.utils.book_append_sheet(wb, ws, date);
      });

      XLSX.writeFile(wb, `All_Daily_Sales_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      
      toast({
        title: "Success",
        description: "All sales records exported to Excel successfully",
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Error",
        description: "Failed to export to Excel",
        variant: "destructive",
      });
    }
  };
  
  const chartData = sortedData.slice(-30).map(item => ({
    date: format(parseISO(item.date), "dd MMM"),
    Petrol: item.petrol,
    Diesel: item.diesel,
    "Lubricant": item.engineOil,
    Lubricants: item.lubricants,
    total: item.petrol + item.diesel + item.engineOil + item.lubricants,
  }));

  const productTotals = salesData.reduce(
    (acc, day) => ({
      petrol: acc.petrol + day.petrol,
      diesel: acc.diesel + day.diesel,
      engineOil: acc.engineOil + day.engineOil,
      lubricants: acc.lubricants + day.lubricants,
    }),
    { petrol: 0, diesel: 0, engineOil: 0, lubricants: 0 }
  );

  const pieData = [
    { name: "Petrol", value: productTotals.petrol },
    { name: "Diesel", value: productTotals.diesel },
    { name: "Lubricant", value: productTotals.engineOil },
    { name: "Lubricants", value: productTotals.lubricants },
  ].filter(item => item.value > 0);

  if (salesData.length === 0) {
    return (
      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No sales data recorded yet. Start by entering daily sales.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Sales Records</CardTitle>
              <CardDescription>View and manage daily sales entries</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-1 border rounded-md p-1">
                <Button 
                  variant={sortOrder === 'new-to-old' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setSortOrder('new-to-old')}
                  className="text-xs"
                >
                  New to Old
                </Button>
                <Button 
                  variant={sortOrder === 'old-to-new' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setSortOrder('old-to-new')}
                  className="text-xs"
                >
                  Old to New
                </Button>
                <Button 
                  variant={sortOrder === 'edited' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setSortOrder('edited')}
                  className="text-xs"
                >
                  Edited
                </Button>
              </div>
              <Button onClick={handleExportToExcel} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Entry</TableHead>
                  <TableHead className="text-right">Petrol</TableHead>
                  <TableHead className="text-right">Diesel</TableHead>
                  <TableHead className="text-right">Lubricant</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.slice(-10).map((sale) => (
                  <TableRow key={`${sale.date}-${sale.entryNumber || 1}`}>
                    <TableCell className="font-medium">{format(parseISO(sale.date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {sale.entryNumber || 1}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">₹{sale.petrol.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">₹{sale.diesel.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">₹{sale.engineOil.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right font-semibold">₹{sale.total.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExportSingleDate(sale.date, sale.entryNumber || 1)}
                          title="Export to Excel"
                        >
                          <Download className="h-4 w-4 text-primary" />
                        </Button>
                        {userRole !== 'Supervisor' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(sale.date, sale.entryNumber || 1)}
                            title="Delete record"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>Daily Sales Trend</CardTitle>
          <CardDescription>Last 30 days revenue breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
              <Bar dataKey="Petrol" fill={COLORS.petrol} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Diesel" fill={COLORS.diesel} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Lubricant" fill={COLORS.engineOil} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Lubricants" fill={COLORS.lubricants} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle>Total Revenue Trend</CardTitle>
            <CardDescription>Combined daily sales over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
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

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle>Product Distribution</CardTitle>
            <CardDescription>Total revenue by product category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>Lubricant Sales Trend</CardTitle>
          <CardDescription>Daily lubricant sales over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
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
              <Bar dataKey="Lubricant" fill={COLORS.engineOil} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesCharts;
