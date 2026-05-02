import { useEffect, useState } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { LayoutGrid, LogOut, Receipt, Save, Plus, Trash2, Calendar, CreditCard, ChevronDown, ChevronRight, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import BillOCRUpload from "@/components/BillOCRUpload";
import DateRangeExportControls from "@/components/DateRangeExportControls";

interface FiservBillEntry {
  id?: string;
  bill_date: Date;
  bill_time: string;
  invoice_number: string;
  card_last_four: string;
  amount: number;
}

interface BharatFleetEntry {
  id?: string;
  bill_date: Date;
  bill_time: string;
  account_no: string;
  card_id: string;
  amount: number;
}

interface SavedFiservBill {
  id: string;
  bill_date: string;
  bill_time: string;
  invoice_number: string;
  card_last_four: string;
  amount: number;
  created_at: string;
}

interface SavedBharatFleetBill {
  id: string;
  bill_date: string;
  bill_time: string;
  account_no: string;
  card_id: string;
  amount: number;
  created_at: string;
}

interface GroupedBills<T> {
  [month: string]: {
    [date: string]: T[];
  };
}

const FiservBills = () => {
  const navigate = useNavigate();
  const { companyId, company } = useCompany();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const companyName = company?.name || "Sales Tracker";
  const companyLogo = company?.logo_url || logo;
  
  const [fiservEntries, setFiservEntries] = useState<FiservBillEntry[]>([
    { bill_date: new Date(), bill_time: '', invoice_number: '', card_last_four: '', amount: 0 }
  ]);
  const [savedFiservBills, setSavedFiservBills] = useState<SavedFiservBill[]>([]);
  
  const [bharatEntries, setBharatEntries] = useState<BharatFleetEntry[]>([
    { bill_date: new Date(), bill_time: '', account_no: '', card_id: '', amount: 0 }
  ]);
  const [savedBharatBills, setSavedBharatBills] = useState<SavedBharatFleetBill[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("fiserv");
  
  const [expandedFiservMonths, setExpandedFiservMonths] = useState<Set<string>>(new Set());
  const [expandedFiservDates, setExpandedFiservDates] = useState<Set<string>>(new Set());
  const [expandedBharatMonths, setExpandedBharatMonths] = useState<Set<string>>(new Set());
  const [expandedBharatDates, setExpandedBharatDates] = useState<Set<string>>(new Set());
  const [exportStartDate, setExportStartDate] = useState<Date | undefined>();
  const [exportEndDate, setExportEndDate] = useState<Date | undefined>();

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

      setUserId(session.user.id);
      const role = sessionStorage.getItem("userRole");
      if (!role) {
        navigate("/login");
      } else {
        setUserRole(role);
      }
    };

    checkAuth();
    fetchSavedBills();

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

  const fetchSavedBills = async () => {
    setLoading(true);
    try {
      const [fiservResult, bharatResult] = await Promise.all([
        supabase
          .from('fiserv_bills')
          .select('*')
          .order('bill_date', { ascending: false })
          .order('bill_time', { ascending: false }),
        supabase
          .from('bharat_fleet_bills')
          .select('*')
          .order('bill_date', { ascending: false })
          .order('bill_time', { ascending: false })
      ]);

      if (fiservResult.error) throw fiservResult.error;
      if (bharatResult.error) throw bharatResult.error;
      
      setSavedFiservBills(fiservResult.data || []);
      setSavedBharatBills(bharatResult.data || []);
      
      // Auto-expand the first month
      if (fiservResult.data && fiservResult.data.length > 0) {
        const firstMonth = format(parseISO(fiservResult.data[0].bill_date), 'yyyy-MM');
        setExpandedFiservMonths(new Set([firstMonth]));
      }
      if (bharatResult.data && bharatResult.data.length > 0) {
        const firstMonth = format(parseISO(bharatResult.data[0].bill_date), 'yyyy-MM');
        setExpandedBharatMonths(new Set([firstMonth]));
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupBillsByMonthAndDate = <T extends { bill_date: string }>(bills: T[]): GroupedBills<T> => {
    const grouped: GroupedBills<T> = {};
    
    bills.forEach(bill => {
      const month = format(parseISO(bill.bill_date), 'yyyy-MM');
      const date = bill.bill_date;
      
      if (!grouped[month]) {
        grouped[month] = {};
      }
      if (!grouped[month][date]) {
        grouped[month][date] = [];
      }
      grouped[month][date].push(bill);
    });
    
    return grouped;
  };

  const toggleFiservMonth = (month: string) => {
    setExpandedFiservMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  const toggleFiservDate = (date: string) => {
    setExpandedFiservDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const toggleBharatMonth = (month: string) => {
    setExpandedBharatMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  const toggleBharatDate = (date: string) => {
    setExpandedBharatDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("userRole");
    navigate("/login");
  };

  const handleGoToShortcut = () => {
    navigate("/shortcut");
  };

  // Fiserv handlers
  const addFiservEntry = () => {
    setFiservEntries([
      ...fiservEntries,
      { bill_date: new Date(), bill_time: '', invoice_number: '', card_last_four: '', amount: 0 }
    ]);
  };

  const removeFiservEntry = (index: number) => {
    if (fiservEntries.length > 1) {
      setFiservEntries(fiservEntries.filter((_, i) => i !== index));
    }
  };

  const updateFiservEntry = (index: number, field: keyof FiservBillEntry, value: any) => {
    const updated = [...fiservEntries];
    updated[index] = { ...updated[index], [field]: value };
    setFiservEntries(updated);
  };

  // Bharat Fleet handlers
  const addBharatEntry = () => {
    setBharatEntries([
      ...bharatEntries,
      { bill_date: new Date(), bill_time: '', account_no: '', card_id: '', amount: 0 }
    ]);
  };

  const removeBharatEntry = (index: number) => {
    if (bharatEntries.length > 1) {
      setBharatEntries(bharatEntries.filter((_, i) => i !== index));
    }
  };

  const updateBharatEntry = (index: number, field: keyof BharatFleetEntry, value: any) => {
    const updated = [...bharatEntries];
    updated[index] = { ...updated[index], [field]: value };
    setBharatEntries(updated);
  };

  const handleSaveFiserv = async () => {
    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    const validEntries = fiservEntries.filter(
      entry => entry.invoice_number.trim() && entry.card_last_four.trim() && entry.amount > 0
    );

    if (validEntries.length === 0) {
      toast.error("Please fill at least one complete entry");
      return;
    }

    setSaving(true);
    try {
      const billsToInsert = validEntries.map(entry => ({
        bill_date: format(entry.bill_date, 'yyyy-MM-dd'),
        bill_time: entry.bill_time || format(new Date(), 'HH:mm:ss'),
        invoice_number: entry.invoice_number.trim(),
        card_last_four: entry.card_last_four.trim(),
        amount: entry.amount,
        user_id: userId,
        company_id: companyId!,
      }));

      const { error } = await supabase
        .from('fiserv_bills')
        .insert(billsToInsert);

      if (error) throw error;

      toast.success(`${validEntries.length} Bank Card bill(s) saved successfully`);
      setFiservEntries([{ bill_date: new Date(), bill_time: '', invoice_number: '', card_last_four: '', amount: 0 }]);
      fetchSavedBills();
    } catch (error: any) {
      console.error('Error saving bills:', error);
      toast.error(error.message || "Failed to save bills");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBharat = async () => {
    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    const validEntries = bharatEntries.filter(
      entry => entry.account_no.trim() && entry.card_id.trim() && entry.amount > 0
    );

    if (validEntries.length === 0) {
      toast.error("Please fill at least one complete entry");
      return;
    }

    setSaving(true);
    try {
      const billsToInsert = validEntries.map(entry => ({
        bill_date: format(entry.bill_date, 'yyyy-MM-dd'),
        bill_time: entry.bill_time || format(new Date(), 'HH:mm:ss'),
        account_no: entry.account_no.trim(),
        card_id: entry.card_id.trim(),
        amount: entry.amount,
        user_id: userId,
        company_id: companyId!,
      }));

      const { error } = await supabase
        .from('bharat_fleet_bills')
        .insert(billsToInsert);

      if (error) throw error;

      toast.success(`${validEntries.length} Bharat Fleet bill(s) saved successfully`);
      setBharatEntries([{ bill_date: new Date(), bill_time: '', account_no: '', card_id: '', amount: 0 }]);
      fetchSavedBills();
    } catch (error: any) {
      console.error('Error saving bills:', error);
      toast.error(error.message || "Failed to save bills");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFiservBill = async (id: string) => {
    if (userRole !== 'Proprietor') {
      toast.error("Only Proprietor can delete bills");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('fiserv_bills')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Bill deleted");
      fetchSavedBills();
    } catch (error: any) {
      console.error('Error deleting bill:', error);
      toast.error(error.message || "Failed to delete bill");
    }
  };

  const handleDeleteBharatBill = async (id: string) => {
    if (userRole !== 'Proprietor') {
      toast.error("Only Proprietor can delete bills");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('bharat_fleet_bills')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Bill deleted");
      fetchSavedBills();
    } catch (error: any) {
      console.error('Error deleting bill:', error);
      toast.error(error.message || "Failed to delete bill");
    }
  };

  const isProprietor = userRole === 'Proprietor';
  const groupedFiservBills = groupBillsByMonthAndDate(savedFiservBills);
  const groupedBharatBills = groupBillsByMonthAndDate(savedBharatBills);

  const getMonthTotal = <T extends { amount: number }>(monthData: { [date: string]: T[] }): number => {
    return Object.values(monthData).flat().reduce((sum, bill) => sum + Number(bill.amount), 0);
  };

  const getDateTotal = <T extends { amount: number }>(bills: T[]): number => {
    return bills.reduce((sum, bill) => sum + Number(bill.amount), 0);
  };

  const handleFiservOCRData = (data: any) => {
    const rows: any[] = Array.isArray(data?.entries) && data.entries.length > 0
      ? data.entries
      : [data];

    const newEntries: FiservBillEntry[] = rows
      .filter((r) => r && (r.invoice_number || r.amount || r.card_last_four))
      .map((r) => ({
        bill_date: r.bill_date ? new Date(r.bill_date) : new Date(),
        bill_time: r.bill_time || '',
        invoice_number: r.invoice_number ? String(r.invoice_number) : '',
        card_last_four: r.card_last_four ? String(r.card_last_four) : '',
        amount: Number(r.amount) || 0,
      }));

    if (newEntries.length === 0) {
      toast.error("No bill data could be extracted");
      return;
    }

    setFiservEntries((prev) => {
      const isPrevEmpty =
        prev.length === 1 &&
        !prev[0].invoice_number &&
        !prev[0].card_last_four &&
        !prev[0].amount;
      return isPrevEmpty ? newEntries : [...prev, ...newEntries];
    });
    toast.success(`${newEntries.length} bill row(s) extracted`);
  };

  const handleBharatOCRData = (data: any) => {
    const rows: any[] = Array.isArray(data?.entries) && data.entries.length > 0
      ? data.entries
      : [data];

    const newEntries: BharatFleetEntry[] = rows
      .filter((r) => r && (r.account_no || r.card_id || r.amount))
      .map((r) => ({
        bill_date: r.bill_date ? new Date(r.bill_date) : new Date(),
        bill_time: r.bill_time || '',
        account_no: r.account_no ? String(r.account_no) : '',
        card_id: r.card_id ? String(r.card_id) : '',
        amount: Number(r.amount) || 0,
      }));

    if (newEntries.length === 0) {
      toast.error("No bill data could be extracted");
      return;
    }

    setBharatEntries((prev) => {
      const isPrevEmpty =
        prev.length === 1 &&
        !prev[0].account_no &&
        !prev[0].card_id &&
        !prev[0].amount;
      return isPrevEmpty ? newEntries : [...prev, ...newEntries];
    });
    toast.success(`${newEntries.length} bill row(s) extracted`);
  };

  const handleExportBills = () => {
    if (exportStartDate && exportEndDate && exportStartDate > exportEndDate) {
      toast.error("From date must be before To date");
      return;
    }

    const isWithinRange = (billDate: string) => {
      const currentDate = parseISO(billDate);
      return (
        (!exportStartDate || currentDate >= exportStartDate) &&
        (!exportEndDate || currentDate <= exportEndDate)
      );
    };

    const filteredFiservBills = savedFiservBills.filter((bill) => isWithinRange(bill.bill_date));
    const filteredBharatBills = savedBharatBills.filter((bill) => isWithinRange(bill.bill_date));

    if (filteredFiservBills.length === 0 && filteredBharatBills.length === 0) {
      toast.error("No bills found in the selected range");
      return;
    }

    const wb = XLSX.utils.book_new();

    // Fiserv Bills sheet
    if (filteredFiservBills.length > 0) {
      const fiservData = [
        ['Fiserv Bills Export'],
        [],
        ['Date', 'Time', 'Invoice Number', 'Card Last 4', 'Amount'],
        ...filteredFiservBills.map(bill => [
          format(parseISO(bill.bill_date), 'dd MMM yyyy'),
          bill.bill_time.slice(0, 5),
          bill.invoice_number,
          bill.card_last_four,
          Number(bill.amount),
        ]),
        [],
        ['', '', '', 'Grand Total', filteredFiservBills.reduce((sum, b) => sum + Number(b.amount), 0)],
      ];
      const ws = XLSX.utils.aoa_to_sheet(fiservData);
      ws['!cols'] = [{ wch: 15 }, { wch: 8 }, { wch: 18 }, { wch: 12 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Fiserv Bills');
    }

    // Bharat Fleet Bills sheet
    if (filteredBharatBills.length > 0) {
      const bharatData = [
        ['Bharat Fleet Card Bills Export'],
        [],
        ['Date', 'Time', 'Account No', 'Card ID', 'Amount'],
        ...filteredBharatBills.map(bill => [
          format(parseISO(bill.bill_date), 'dd MMM yyyy'),
          bill.bill_time.slice(0, 5),
          bill.account_no,
          bill.card_id,
          Number(bill.amount),
        ]),
        [],
        ['', '', '', 'Grand Total', filteredBharatBills.reduce((sum, b) => sum + Number(b.amount), 0)],
      ];
      const ws = XLSX.utils.aoa_to_sheet(bharatData);
      ws['!cols'] = [{ wch: 15 }, { wch: 8 }, { wch: 18 }, { wch: 12 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Bharat Fleet');
    }

    XLSX.writeFile(wb, `Bill_Entry_Export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success("Bills exported to Excel");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={companyLogo} alt={companyName} className="h-14 w-auto object-contain" referrerPolicy="no-referrer" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Bill Entry</h1>
                <p className="text-sm text-muted-foreground">Manage Bank Card & Bharat Fleet transactions</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleExportBills} disabled={savedFiservBills.length === 0 && savedBharatBills.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export
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

      <main className="container mx-auto px-4 py-8 space-y-6">
        <DateRangeExportControls
          startDate={exportStartDate}
          endDate={exportEndDate}
          onStartDateChange={setExportStartDate}
          onEndDateChange={setExportEndDate}
          onExport={handleExportBills}
          disabled={savedFiservBills.length === 0 && savedBharatBills.length === 0}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fiserv" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Bank Card Bills
            </TabsTrigger>
            <TabsTrigger value="bharat" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Bharat Fleet Card
            </TabsTrigger>
          </TabsList>

          {/* Fiserv Tab */}
          <TabsContent value="fiserv" className="space-y-6">
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  New Bank Card Bill Entry
                </CardTitle>
                <div className="flex gap-2">
                  <BillOCRUpload 
                    billType="fiserv" 
                    onDataExtracted={handleFiservOCRData}
                    disabled={saving}
                  />
                  <Button variant="outline" size="sm" onClick={addFiservEntry}>
                    <Plus className="mr-2 h-4 w-4" />
                    Bank Card Bill
                  </Button>
                  <Button onClick={handleSaveFiserv} disabled={saving} size="sm">
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Bills'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fiservEntries.map((entry, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg bg-muted/30">
                      <div className="space-y-2">
                        <Label className="text-xs">Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal h-9",
                                !entry.bill_date && "text-muted-foreground"
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {entry.bill_date ? format(entry.bill_date, "dd/MM/yyyy") : "Pick date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={entry.bill_date}
                              onSelect={(date) => date && updateFiservEntry(index, 'bill_date', date)}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Time</Label>
                        <Input
                          type="time"
                          value={entry.bill_time}
                          onChange={(e) => updateFiservEntry(index, 'bill_time', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Invoice Number</Label>
                        <Input
                          type="text"
                          value={entry.invoice_number}
                          onChange={(e) => updateFiservEntry(index, 'invoice_number', e.target.value)}
                          placeholder="INV-001"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Card Last 4 Digits</Label>
                        <Input
                          type="text"
                          maxLength={4}
                          value={entry.card_last_four}
                          onChange={(e) => updateFiservEntry(index, 'card_last_four', e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="1234"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Amount</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.amount === 0 ? '' : entry.amount}
                          onChange={(e) => updateFiservEntry(index, 'amount', parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          placeholder="0.00"
                          className="h-9"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFiservEntry(index)}
                          disabled={fiservEntries.length === 1}
                          className="h-9 w-9 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Saved Bank Card Bills
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <p className="text-muted-foreground">Loading bills...</p>
                  </div>
                ) : savedFiservBills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No Bank Card bills saved yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(groupedFiservBills).map(([month, dateData]) => (
                      <Collapsible key={month} open={expandedFiservMonths.has(month)}>
                        <CollapsibleTrigger
                          onClick={() => toggleFiservMonth(month)}
                          className="flex items-center justify-between w-full p-3 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {expandedFiservMonths.has(month) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="font-semibold">{format(parseISO(`${month}-01`), 'MMMM yyyy')}</span>
                          </div>
                          <span className="font-bold text-primary">
                            ₹{getMonthTotal(dateData).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-4 pt-2 space-y-2">
                          {Object.entries(dateData).map(([date, bills]) => (
                            <Collapsible key={date} open={expandedFiservDates.has(date)}>
                              <CollapsibleTrigger
                                onClick={() => toggleFiservDate(date)}
                                className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md hover:bg-muted transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {expandedFiservDates.has(date) ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  <span className="text-sm font-medium">
                                    {format(parseISO(date), 'dd MMM yyyy')} ({format(parseISO(date), 'EEEE')})
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({bills.length} bills)
                                  </span>
                                </div>
                                <span className="font-semibold">
                                  ₹{getDateTotal(bills).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="pl-4 pt-1">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-xs">Time</TableHead>
                                      <TableHead className="text-xs">Invoice</TableHead>
                                      <TableHead className="text-xs">Card</TableHead>
                                      <TableHead className="text-xs text-right">Amount</TableHead>
                                      {isProprietor && <TableHead className="w-8"></TableHead>}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {bills.map((bill) => (
                                      <TableRow key={bill.id}>
                                        <TableCell className="text-xs">{bill.bill_time.slice(0, 5)}</TableCell>
                                        <TableCell className="text-xs font-mono">{bill.invoice_number}</TableCell>
                                        <TableCell className="text-xs font-mono">****{bill.card_last_four}</TableCell>
                                        <TableCell className="text-xs text-right font-medium">₹{Number(bill.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                        {isProprietor && (
                                          <TableCell>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleDeleteFiservBill(bill.id)}
                                              className="h-6 w-6 text-destructive hover:text-destructive"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </TableCell>
                                        )}
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </CollapsibleContent>
                            </Collapsible>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                    {/* Grand Total */}
                    <div className="mt-4 p-3 bg-primary/20 rounded-lg flex justify-between items-center">
                      <span className="font-bold">Grand Total:</span>
                      <span className="text-xl font-bold text-primary">
                        ₹{savedFiservBills.reduce((sum, bill) => sum + Number(bill.amount), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bharat Fleet Card Tab */}
          <TabsContent value="bharat" className="space-y-6">
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  New Bharat Fleet Card Entry
                </CardTitle>
                <div className="flex gap-2">
                  <BillOCRUpload 
                    billType="bharat" 
                    onDataExtracted={handleBharatOCRData}
                    disabled={saving}
                  />
                  <Button variant="outline" size="sm" onClick={addBharatEntry}>
                    <Plus className="mr-2 h-4 w-4" />
                    Bharat Fleet Card
                  </Button>
                  <Button onClick={handleSaveBharat} disabled={saving} size="sm">
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Bills'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bharatEntries.map((entry, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg bg-muted/30">
                      <div className="space-y-2">
                        <Label className="text-xs">Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal h-9",
                                !entry.bill_date && "text-muted-foreground"
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {entry.bill_date ? format(entry.bill_date, "dd/MM/yyyy") : "Pick date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={entry.bill_date}
                              onSelect={(date) => date && updateBharatEntry(index, 'bill_date', date)}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Time</Label>
                        <Input
                          type="time"
                          value={entry.bill_time}
                          onChange={(e) => updateBharatEntry(index, 'bill_time', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Account No.</Label>
                        <Input
                          type="text"
                          value={entry.account_no}
                          onChange={(e) => updateBharatEntry(index, 'account_no', e.target.value)}
                          placeholder="ACC-001"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Card ID</Label>
                        <Input
                          type="text"
                          value={entry.card_id}
                          onChange={(e) => updateBharatEntry(index, 'card_id', e.target.value)}
                          placeholder="CARD-001"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Amount</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.amount === 0 ? '' : entry.amount}
                          onChange={(e) => updateBharatEntry(index, 'amount', parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          placeholder="0.00"
                          className="h-9"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBharatEntry(index)}
                          disabled={bharatEntries.length === 1}
                          className="h-9 w-9 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Saved Bharat Fleet Bills
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <p className="text-muted-foreground">Loading bills...</p>
                  </div>
                ) : savedBharatBills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No Bharat Fleet bills saved yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(groupedBharatBills).map(([month, dateData]) => (
                      <Collapsible key={month} open={expandedBharatMonths.has(month)}>
                        <CollapsibleTrigger
                          onClick={() => toggleBharatMonth(month)}
                          className="flex items-center justify-between w-full p-3 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {expandedBharatMonths.has(month) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="font-semibold">{format(parseISO(`${month}-01`), 'MMMM yyyy')}</span>
                          </div>
                          <span className="font-bold text-primary">
                            ₹{getMonthTotal(dateData).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-4 pt-2 space-y-2">
                          {Object.entries(dateData).map(([date, bills]) => (
                            <Collapsible key={date} open={expandedBharatDates.has(date)}>
                              <CollapsibleTrigger
                                onClick={() => toggleBharatDate(date)}
                                className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md hover:bg-muted transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {expandedBharatDates.has(date) ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  <span className="text-sm font-medium">
                                    {format(parseISO(date), 'dd MMM yyyy')} ({format(parseISO(date), 'EEEE')})
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({bills.length} bills)
                                  </span>
                                </div>
                                <span className="font-semibold">
                                  ₹{getDateTotal(bills).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="pl-4 pt-1">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-xs">Time</TableHead>
                                      <TableHead className="text-xs">Account No.</TableHead>
                                      <TableHead className="text-xs">Card ID</TableHead>
                                      <TableHead className="text-xs text-right">Amount</TableHead>
                                      {isProprietor && <TableHead className="w-8"></TableHead>}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {bills.map((bill) => (
                                      <TableRow key={bill.id}>
                                        <TableCell className="text-xs">{bill.bill_time.slice(0, 5)}</TableCell>
                                        <TableCell className="text-xs font-mono">{bill.account_no}</TableCell>
                                        <TableCell className="text-xs font-mono">{bill.card_id}</TableCell>
                                        <TableCell className="text-xs text-right font-medium">₹{Number(bill.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                        {isProprietor && (
                                          <TableCell>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleDeleteBharatBill(bill.id)}
                                              className="h-6 w-6 text-destructive hover:text-destructive"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </TableCell>
                                        )}
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </CollapsibleContent>
                            </Collapsible>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                    {/* Grand Total */}
                    <div className="mt-4 p-3 bg-primary/20 rounded-lg flex justify-between items-center">
                      <span className="font-bold">Grand Total:</span>
                      <span className="text-xl font-bold text-primary">
                        ₹{savedBharatBills.reduce((sum, bill) => sum + Number(bill.amount), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default FiservBills;
