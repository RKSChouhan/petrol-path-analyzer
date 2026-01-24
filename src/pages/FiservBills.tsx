import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { LayoutGrid, LogOut, Receipt, Save, Plus, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface FiservBillEntry {
  id?: string;
  bill_date: Date;
  bill_time: string;
  invoice_number: string;
  card_last_four: string;
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

const FiservBills = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<FiservBillEntry[]>([
    { bill_date: new Date(), bill_time: '', invoice_number: '', card_last_four: '', amount: 0 }
  ]);
  const [savedBills, setSavedBills] = useState<SavedFiservBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
      const { data, error } = await supabase
        .from('fiserv_bills')
        .select('*')
        .order('bill_date', { ascending: false })
        .order('bill_time', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSavedBills(data || []);
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

  const addEntry = () => {
    setEntries([
      ...entries,
      { bill_date: new Date(), bill_time: '', invoice_number: '', card_last_four: '', amount: 0 }
    ]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: keyof FiservBillEntry, value: any) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  const handleSave = async () => {
    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    // Validate entries
    const validEntries = entries.filter(
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

      toast.success(`${validEntries.length} bill(s) saved successfully`);
      setEntries([{ bill_date: new Date(), bill_time: '', invoice_number: '', card_last_four: '', amount: 0 }]);
      fetchSavedBills();
    } catch (error: any) {
      console.error('Error saving bills:', error);
      toast.error(error.message || "Failed to save bills");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBill = async (id: string) => {
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Sri MahaLingam Agency" className="h-14 w-auto object-contain" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Fiserv Bills</h1>
                <p className="text-sm text-muted-foreground">Manage Fiserv transactions</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Bills'}
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
        {/* Data Entry Card */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              New Bill Entry
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addEntry}>
              <Plus className="mr-2 h-4 w-4" />
              Add Row
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {entries.map((entry, index) => (
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
                          onSelect={(date) => date && updateEntry(index, 'bill_date', date)}
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
                      onChange={(e) => updateEntry(index, 'bill_time', e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Invoice Number</Label>
                    <Input
                      type="text"
                      value={entry.invoice_number}
                      onChange={(e) => updateEntry(index, 'invoice_number', e.target.value)}
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
                      onChange={(e) => updateEntry(index, 'card_last_four', e.target.value.replace(/\D/g, '').slice(0, 4))}
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
                      onChange={(e) => updateEntry(index, 'amount', parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0.00"
                      className="h-9"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEntry(index)}
                      disabled={entries.length === 1}
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

        {/* Saved Bills Card */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Saved Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <p className="text-muted-foreground">Loading bills...</p>
              </div>
            ) : savedBills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No bills saved yet.</p>
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
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell>{format(new Date(bill.bill_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{bill.bill_time.slice(0, 5)}</TableCell>
                        <TableCell className="font-mono">{bill.invoice_number}</TableCell>
                        <TableCell className="font-mono">****{bill.card_last_four}</TableCell>
                        <TableCell className="text-right font-medium">₹{Number(bill.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteBill(bill.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default FiservBills;
