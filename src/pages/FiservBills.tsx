import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { LayoutGrid, LogOut, Receipt, Save, Plus, Trash2, Calendar, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const FiservBills = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Fiserv entries
  const [fiservEntries, setFiservEntries] = useState<FiservBillEntry[]>([
    { bill_date: new Date(), bill_time: '', invoice_number: '', card_last_four: '', amount: 0 }
  ]);
  const [savedFiservBills, setSavedFiservBills] = useState<SavedFiservBill[]>([]);
  
  // Bharat Fleet entries
  const [bharatEntries, setBharatEntries] = useState<BharatFleetEntry[]>([
    { bill_date: new Date(), bill_time: '', account_no: '', card_id: '', amount: 0 }
  ]);
  const [savedBharatBills, setSavedBharatBills] = useState<SavedBharatFleetBill[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("fiserv");

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
          .order('bill_time', { ascending: false })
          .limit(50),
        supabase
          .from('bharat_fleet_bills')
          .select('*')
          .order('bill_date', { ascending: false })
          .order('bill_time', { ascending: false })
          .limit(50)
      ]);

      if (fiservResult.error) throw fiservResult.error;
      if (bharatResult.error) throw bharatResult.error;
      
      setSavedFiservBills(fiservResult.data || []);
      setSavedBharatBills(bharatResult.data || []);
    } catch (error) {
      console.error('Error fetching bills:', error);
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
      }));

      const { error } = await supabase
        .from('fiserv_bills')
        .insert(billsToInsert);

      if (error) throw error;

      toast.success(`${validEntries.length} Fiserv bill(s) saved successfully`);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Sri MahaLingam Agency" className="h-14 w-auto object-contain" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Bill Entry</h1>
                <p className="text-sm text-muted-foreground">Manage Fiserv & Bharat Fleet transactions</p>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fiserv" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Fiserv Bills
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
                  New Fiserv Bill Entry
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addFiservEntry}>
                    <Plus className="mr-2 h-4 w-4" />
                    Fiserv Bill
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
                  Saved Fiserv Bills
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
                    <p className="text-muted-foreground">No Fiserv bills saved yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Card (Last 4)</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          {isProprietor && <TableHead className="w-12"></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {savedFiservBills.map((bill) => (
                          <TableRow key={bill.id}>
                            <TableCell>{format(new Date(bill.bill_date), 'dd MMM yyyy')}</TableCell>
                            <TableCell>{bill.bill_time.slice(0, 5)}</TableCell>
                            <TableCell className="font-mono">{bill.invoice_number}</TableCell>
                            <TableCell className="font-mono">****{bill.card_last_four}</TableCell>
                            <TableCell className="text-right font-medium">₹{Number(bill.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                            {isProprietor && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteFiservBill(bill.id)}
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                        {/* Total Row */}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={4} className="text-right">Total Amount:</TableCell>
                          <TableCell className="text-right text-lg">
                            ₹{savedFiservBills.reduce((sum, bill) => sum + Number(bill.amount), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          {isProprietor && <TableCell></TableCell>}
                        </TableRow>
                      </TableBody>
                    </Table>
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
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Account No.</TableHead>
                          <TableHead>Card ID</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          {isProprietor && <TableHead className="w-12"></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {savedBharatBills.map((bill) => (
                          <TableRow key={bill.id}>
                            <TableCell>{format(new Date(bill.bill_date), 'dd MMM yyyy')}</TableCell>
                            <TableCell>{bill.bill_time.slice(0, 5)}</TableCell>
                            <TableCell className="font-mono">{bill.account_no}</TableCell>
                            <TableCell className="font-mono">{bill.card_id}</TableCell>
                            <TableCell className="text-right font-medium">₹{Number(bill.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                            {isProprietor && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteBharatBill(bill.id)}
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                        {/* Total Row */}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={4} className="text-right">Total Amount:</TableCell>
                          <TableCell className="text-right text-lg">
                            ₹{savedBharatBills.reduce((sum, bill) => sum + Number(bill.amount), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          {isProprietor && <TableCell></TableCell>}
                        </TableRow>
                      </TableBody>
                    </Table>
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
