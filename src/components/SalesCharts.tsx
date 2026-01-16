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
  const [countdown, setCountdown] = useState(10);
  const deleteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | null>(null);
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
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
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (toastIdRef.current) {
      dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
    setPendingDelete(null);
    setCountdown(10);
    toast({
      title: "Undo successful",
      description: "Delete cancelled",
    });
  };

  // Update toast with countdown
  const updateToastWithCountdown = (entryNumber: number, secondsLeft: number) => {
    if (toastIdRef.current) {
      dismiss(toastIdRef.current);
    }
    const { id } = toast({
      title: "Deleting...",
      description: (
        <div className="flex items-center justify-between gap-4">
          <span>Entry {entryNumber} will be deleted in <strong>{secondsLeft}s</strong></span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleUndo}
            className="shrink-0"
          >
            <Undo2 className="mr-1 h-3 w-3" />
            Undo ({secondsLeft})
          </Button>
        </div>
      ),
      duration: secondsLeft * 1000 + 500,
    });
    toastIdRef.current = id;
  };

  const handleDelete = (date: string, entryNumber: number) => {
    // Cancel any existing pending delete
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    if (toastIdRef.current) {
      dismiss(toastIdRef.current);
    }

    setPendingDelete({ date, entryNumber });
    setCountdown(10);

    // Show initial toast
    updateToastWithCountdown(entryNumber, 10);

    // Start countdown interval
    let secondsLeft = 10;
    countdownIntervalRef.current = setInterval(() => {
      secondsLeft--;
      setCountdown(secondsLeft);
      if (secondsLeft > 0) {
        updateToastWithCountdown(entryNumber, secondsLeft);
      }
    }, 1000);

    // Set timer for actual delete
    deleteTimerRef.current = setTimeout(() => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      executeDelete(date, entryNumber);
      toastIdRef.current = null;
      deleteTimerRef.current = null;
      setCountdown(10);
    }, 10000);
  };

  const handleExportSingleDate = async (date: string, entryNumber: number) => {
    try {
      // Fetch detailed data for specific date and entry
      const { data: sale, error } = await supabase
        .from('daily_sales')
        .select('*, pump_readings(*), oil_sales(*), payment_methods(*), cash_denominations(*), expenses(*), debtors(*), repaid_debtors(*), daily_attendance(employee_name)')
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

      // Get submitted attendance for this entry
      const attendanceList = sale.daily_attendance || [];

      const pumpReadings = sale.pump_readings || [];
      const oilSalesArray = sale.oil_sales || [];
      const paymentMethods = sale.payment_methods || [];
      const cashDenom = sale.cash_denominations || [];
      const expensesArray = sale.expenses || [];
      const debtorsArray = sale.debtors || [];
      const repaidDebtorsArray = sale.repaid_debtors || [];

      // Calculate totals for summary
      const petrolReadings = pumpReadings.filter((p: any) => p.pump_type === 'petrol');
      const dieselReadings = pumpReadings.filter((p: any) => p.pump_type === 'diesel');
      
      const petrolSales = petrolReadings.reduce((sum: number, p: any) => 
        sum + ((p.closing_reading - p.opening_reading) * p.price_per_litre), 0);
      const dieselSales = dieselReadings.reduce((sum: number, p: any) => 
        sum + ((p.closing_reading - p.opening_reading) * p.price_per_litre), 0);

      // Calculate total oil/lubricant sales
      const totalOilAmount = oilSalesArray.reduce((sum: number, oil: any) => sum + (oil.total_amount || 0), 0);
      const totalOilPrices = oilSalesArray.reduce((sum: number, oil: any) => sum + (oil.oil_price || 0), 0);
      const lubricantTotal = totalOilAmount + totalOilPrices;

      // Calculate payment totals
      const totalDigitalPayment = paymentMethods.reduce((sum: number, pm: any) => 
        sum + (pm.phone_pay || 0) + (pm.gpay || 0) + (pm.bharat_fleet_card || 0) + 
        (pm.fiserv || 0) + (pm.debit || 0) + (pm.ubi || 0) + (pm.evening_locker || 0), 0);

      // Calculate cash totals
      const totalCashInHand = cashDenom.reduce((sum: number, cd: any) => 
        sum + ((cd.rs_500 || 0) * 500) + ((cd.rs_200 || 0) * 200) + ((cd.rs_100 || 0) * 100) + 
        ((cd.rs_50 || 0) * 50) + ((cd.rs_20 || 0) * 20) + ((cd.rs_10 || 0) * 10) + (cd.coins || 0), 0);

      // Calculate expense and debtor totals
      const totalExpenses = expensesArray.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const totalDebtorAmount = debtorsArray.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
      const totalRepaidDebtorMoney = repaidDebtorsArray.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

      // Calculate summary values
      const totalIncomeProduced = petrolSales + dieselSales + lubricantTotal + totalRepaidDebtorMoney;
      const totalExpenseAmount = totalExpenses + totalDebtorAmount;
      const salesAmount = Math.ceil((totalIncomeProduced - totalExpenseAmount) / 10) * 10;
      const totalCashOnHand = Math.ceil((salesAmount - totalDigitalPayment) / 10) * 10;

      // Build Excel data following the template format
      const detailData: any[][] = [
        ['DAILY SALES REPORT'],
        [],
        ['Date & Time of Entry', sale.updated_at ? format(new Date(sale.updated_at), "dd MMM yyyy hh:mm a") : '-'],
        ['Saved By', sale.saved_by || '-'],
        [],
        ['ATTENDANCE (Present Employees)'],
        ['Employee Name'],
        ...(attendanceList.length > 0 
          ? attendanceList.map((att: any, idx: number) => [`${idx + 1}. ${att.employee_name}`])
          : [['No attendance recorded']]
        ),
        ['Total Present', attendanceList.length],
        [],
        ['PETROL PUMP READINGS'],
        ['Pump', 'Opening Reading', 'Closing Reading', 'Sales in Litres', 'Price per Litre', 'Sales Amount'],
        ...petrolReadings.map((p: any) => [
          `PETROL PUMP-${p.pump_number}`,
          p.opening_reading,
          p.closing_reading,
          p.sales_litres || (p.closing_reading - p.opening_reading),
          `₹${p.price_per_litre}`,
          `₹${((p.closing_reading - p.opening_reading) * p.price_per_litre).toFixed(2)}`
        ]),
        [],
        ['DIESEL PUMP READINGS'],
        ['Pump', 'Opening Reading', 'Closing Reading', 'Sales in Litres', 'Price per Litre', 'Sales Amount'],
        ...dieselReadings.map((p: any) => [
          `DIESEL PUMP-${p.pump_number}`,
          p.opening_reading,
          p.closing_reading,
          p.sales_litres || (p.closing_reading - p.opening_reading),
          `₹${p.price_per_litre}`,
          `₹${((p.closing_reading - p.opening_reading) * p.price_per_litre).toFixed(2)}`
        ]),
        [],
        ['OIL SALES'],
        ['Oil Name', 'Count', 'Price', '2T Oil Yesterday', '2T Oil Today', 'Total Litres', 'Total Amount', 'Distilled Water', 'Waste'],
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
        ['REPAID DEBTOR MONEY'],
        ['Name', 'Amount'],
        ...(repaidDebtorsArray.length > 0 
          ? repaidDebtorsArray.map((r: any) => [r.name || '-', `₹${r.amount || 0}`])
          : [['-', '₹0']]
        ),
        ['Total Repaid', `₹${totalRepaidDebtorMoney}`],
        [],
        ['EXPENSES'],
        ['Name', 'Amount'],
        ...(expensesArray.length > 0 
          ? expensesArray.map((e: any) => [e.name || '-', `₹${e.amount || 0}`])
          : [['-', '₹0']]
        ),
        ['Total Expenses', `₹${totalExpenses}`],
        [],
        ['DEBTORS'],
        ['Name', 'Amount'],
        ...(debtorsArray.length > 0 
          ? debtorsArray.map((d: any) => [d.name || '-', `₹${d.amount || 0}`])
          : [['-', '₹0']]
        ),
        ['Total Debtors', `₹${totalDebtorAmount}`],
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
          `₹${((cd.rs_500 || 0) * 500) + ((cd.rs_200 || 0) * 200) + ((cd.rs_100 || 0) * 100) + 
            ((cd.rs_50 || 0) * 50) + ((cd.rs_20 || 0) * 20) + ((cd.rs_10 || 0) * 10) + (cd.coins || 0)}`
        ]),
        [],
        ['SUMMARY'],
        ['Total Income Produced', `₹${totalIncomeProduced.toFixed(2)}`],
        ['Total Expense', `₹${totalExpenseAmount}`],
        ['Sales Amount', `₹${salesAmount}`],
        ['Total Digital Payment', `₹${totalDigitalPayment}`],
        ['Total Cash on Hand', `₹${totalCashOnHand}`],
        ['Total Cash in Hand', `₹${totalCashInHand}`],
        [],
        ['COMMENTS'],
        [sale.comment || 'No comments'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(detailData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];
      
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
        .select('*, pump_readings(*), oil_sales(*), payment_methods(*), cash_denominations(*), expenses(*), debtors(*), repaid_debtors(*), daily_attendance(employee_name)')
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
        const expensesArray = sale.expenses || [];
        const debtorsArray = sale.debtors || [];
        const repaidDebtorsArray = sale.repaid_debtors || [];
        const attendanceList = sale.daily_attendance || [];

        const petrolReadings = pumpReadings.filter((p: any) => p.pump_type === 'petrol');
        const dieselReadings = pumpReadings.filter((p: any) => p.pump_type === 'diesel');
        
        const petrolSales = petrolReadings.reduce((sum: number, p: any) => 
          sum + ((p.closing_reading - p.opening_reading) * p.price_per_litre), 0);
        const dieselSales = dieselReadings.reduce((sum: number, p: any) => 
          sum + ((p.closing_reading - p.opening_reading) * p.price_per_litre), 0);

        const totalOilAmount = oilSalesArray.reduce((sum: number, oil: any) => sum + (oil.total_amount || 0), 0);
        const totalOilPrices = oilSalesArray.reduce((sum: number, oil: any) => sum + (oil.oil_price || 0), 0);
        const lubricantTotal = totalOilAmount + totalOilPrices;

        const totalDigitalPayment = paymentMethods.reduce((sum: number, pm: any) => 
          sum + (pm.phone_pay || 0) + (pm.gpay || 0) + (pm.bharat_fleet_card || 0) + 
          (pm.fiserv || 0) + (pm.debit || 0) + (pm.ubi || 0) + (pm.evening_locker || 0), 0);

        const totalCashInHand = cashDenom.reduce((sum: number, cd: any) => 
          sum + ((cd.rs_500 || 0) * 500) + ((cd.rs_200 || 0) * 200) + ((cd.rs_100 || 0) * 100) + 
          ((cd.rs_50 || 0) * 50) + ((cd.rs_20 || 0) * 20) + ((cd.rs_10 || 0) * 10) + (cd.coins || 0), 0);

        const totalExpenses = expensesArray.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
        const totalDebtorAmount = debtorsArray.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
        const totalRepaidDebtorMoney = repaidDebtorsArray.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

        const totalIncomeProduced = petrolSales + dieselSales + lubricantTotal + totalRepaidDebtorMoney;
        const totalExpenseAmount = totalExpenses + totalDebtorAmount;
        const salesAmount = Math.ceil((totalIncomeProduced - totalExpenseAmount) / 10) * 10;
        const totalCashOnHand = Math.ceil((salesAmount - totalDigitalPayment) / 10) * 10;

        const detailData: any[][] = [
          ['DAILY SALES REPORT - ' + date],
          ['Date & Time of Entry', sale.updated_at ? format(new Date(sale.updated_at), "dd MMM yyyy hh:mm a") : '-'],
          ['Saved By', sale.saved_by || '-'],
          [],
          ['ATTENDANCE (Present Employees)'],
          ...(attendanceList.length > 0 
            ? attendanceList.map((att: any, idx: number) => [`${idx + 1}. ${att.employee_name}`])
            : [['No attendance recorded']]
          ),
          ['Total Present', attendanceList.length],
          [],
          ['PETROL READINGS'],
          ...petrolReadings.map((p: any) => [`PETROL PUMP-${p.pump_number}`, p.opening_reading, p.closing_reading, `₹${((p.closing_reading - p.opening_reading) * p.price_per_litre).toFixed(2)}`]),
          ['DIESEL READINGS'],
          ...dieselReadings.map((p: any) => [`DIESEL PUMP-${p.pump_number}`, p.opening_reading, p.closing_reading, `₹${((p.closing_reading - p.opening_reading) * p.price_per_litre).toFixed(2)}`]),
          [],
          ['OIL SALES'],
          ...oilSalesArray.map((oil: any) => [oil.oil_name || '-', oil.oil_count || 0, `₹${oil.oil_price || 0}`, `₹${oil.total_amount || 0}`]),
          [],
          ['REPAID DEBTORS'],
          ...repaidDebtorsArray.map((r: any) => [r.name || '-', `₹${r.amount || 0}`]),
          ['EXPENSES'],
          ...expensesArray.map((e: any) => [e.name || '-', `₹${e.amount || 0}`]),
          ['DEBTORS'],
          ...debtorsArray.map((d: any) => [d.name || '-', `₹${d.amount || 0}`]),
          [],
          ['PAYMENT METHODS'],
          ...paymentMethods.map((pm: any) => [pm.cashier_group.toUpperCase(), `UPI: ₹${(pm.phone_pay || 0) + (pm.gpay || 0)}`, `Fleet: ₹${pm.bharat_fleet_card || 0}`, `Fiserv: ₹${pm.fiserv || 0}`]),
          [],
          ['CASH DENOMINATIONS'],
          ...cashDenom.map((cd: any) => [cd.cashier_group.toUpperCase(), `₹500x${cd.rs_500 || 0}`, `₹200x${cd.rs_200 || 0}`, `₹100x${cd.rs_100 || 0}`, `Coins: ₹${cd.coins || 0}`]),
          [],
          ['SUMMARY'],
          ['Total Income Produced', `₹${totalIncomeProduced.toFixed(2)}`],
          ['Total Expense', `₹${totalExpenseAmount}`],
          ['Sales Amount', `₹${salesAmount}`],
          ['Total Digital Payment', `₹${totalDigitalPayment}`],
          ['Total Cash on Hand', `₹${totalCashOnHand}`],
          [],
          ['COMMENTS', sale.comment || '-'],
        ];

        const ws = XLSX.utils.aoa_to_sheet(detailData);
        XLSX.utils.book_append_sheet(wb, ws, `${date}_E${sale.entry_number || 1}`);
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
    total: item.petrol + item.diesel + item.engineOil,
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
                  <TableHead className="text-center">Saved By</TableHead>
                  <TableHead className="text-right">Petrol</TableHead>
                  <TableHead className="text-right">Diesel</TableHead>
                  <TableHead className="text-right">Lubricant</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Saved on</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.slice(-10).map((sale) => (
                  <TableRow key={`${sale.date}-${sale.entryNumber || 1}`}>
                    <TableCell className="font-medium">
                      {format(parseISO(sale.date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {sale.entryNumber || 1}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {sale.savedBy ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          sale.savedBy === 'Proprietor' 
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {sale.savedBy === 'Proprietor' ? 'P' : 'S'}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">₹{sale.petrol.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">₹{sale.diesel.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">₹{sale.engineOil.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right font-semibold">₹{sale.total.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-center">
                      {sale.updatedAt ? (
                        <div className="text-sm">
                          <div>{format(new Date(sale.updatedAt), "dd MMM yyyy")}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(sale.updatedAt), "hh:mm a")}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
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
