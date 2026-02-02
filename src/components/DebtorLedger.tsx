import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { IndianRupee, Plus, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DebtorLedgerItem {
  id: string;
  name: string;
  amount: number;
  bill_number?: string;
}

interface DebtorLedgerProps {
  userId: string;
}

const DebtorLedger = ({ userId }: DebtorLedgerProps) => {
  const { toast } = useToast();
  const [debtors, setDebtors] = useState<DebtorLedgerItem[]>([]);
  const [newDebtorName, setNewDebtorName] = useState("");
  const [newDebtorBillNumber, setNewDebtorBillNumber] = useState("");
  const [newDebtorAmount, setNewDebtorAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchDebtors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("debtor_ledger")
      .select("*")
      .eq("user_id", userId)
      .order("name");

    if (error) {
      console.error("Error fetching debtors:", error);
    } else {
      setDebtors(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userId) {
      fetchDebtors();
    }
  }, [userId]);

  const handleAddDebtor = async () => {
    if (!newDebtorName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a debtor name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("debtor_ledger").upsert(
      {
        user_id: userId,
        name: newDebtorName.trim(),
        bill_number: newDebtorBillNumber.trim(),
        amount: newDebtorAmount,
      },
      { onConflict: "user_id,name" }
    );

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add debtor",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Debtor added successfully",
      });
      setNewDebtorName("");
      setNewDebtorBillNumber("");
      setNewDebtorAmount(0);
      fetchDebtors();
    }
    setLoading(false);
  };

  const handleDeleteDebtor = async (id: string) => {
    setLoading(true);
    const { error } = await supabase.from("debtor_ledger").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete debtor",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Debtor deleted successfully",
      });
      fetchDebtors();
    }
    setLoading(false);
  };

  const calculateTotal = () => {
    return debtors.reduce((sum, d) => sum + d.amount, 0);
  };

  return (
    <Card className="shadow-[var(--shadow-card)] border-2 border-red-200 bg-red-50/50 dark:bg-red-950/10 dark:border-red-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-red-600 dark:text-red-400">
            <IndianRupee className="h-5 w-5" />
            Debtor Ledger
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDebtors}
            disabled={loading}
            className="h-8 px-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Debtor */}
        <div className="flex flex-wrap items-end gap-2 pb-3 border-b border-red-200 dark:border-red-800">
          <div className="flex-1 min-w-[120px] space-y-1">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              type="text"
              value={newDebtorName}
              onChange={(e) => setNewDebtorName(e.target.value)}
              placeholder="Debtor name"
              className="h-9"
            />
          </div>
          <div className="w-24 space-y-1">
            <Label className="text-xs text-muted-foreground">Bill No.</Label>
            <Input
              type="text"
              value={newDebtorBillNumber}
              onChange={(e) => setNewDebtorBillNumber(e.target.value)}
              placeholder="Bill #"
              className="h-9"
            />
          </div>
          <div className="w-24 space-y-1">
            <Label className="text-xs text-muted-foreground">Amount</Label>
            <Input
              type="number"
              value={newDebtorAmount || ""}
              onChange={(e) => setNewDebtorAmount(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="h-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddDebtor}
            disabled={loading}
            className="h-9 px-2 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Debtor List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {debtors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No debtors in ledger
            </p>
          ) : (
            debtors.map((debtor) => (
              <div
                key={debtor.id}
                className="flex items-center justify-between p-2 bg-card rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{debtor.name}</p>
                  {debtor.bill_number && (
                    <p className="text-xs text-muted-foreground">Bill: {debtor.bill_number}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    ₹{debtor.amount.toLocaleString("en-IN")}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDebtor(debtor.id)}
                    disabled={loading}
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Total */}
        <div className="pt-3 border-t border-red-200 dark:border-red-800">
          <div className="flex justify-between items-center">
            <Label className="text-sm text-muted-foreground">Total Outstanding</Label>
            <span className="text-xl font-bold text-red-600 dark:text-red-400">
              ₹{calculateTotal().toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DebtorLedger;
