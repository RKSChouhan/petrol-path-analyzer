import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface StorageProduct {
  id: string;
  name: string;
  price: number;
  count: number;
}

interface StorageProductListProps {
  companyId: string | null;
  userRole: string | null;
}

const StorageProductList = ({ companyId, userRole }: StorageProductListProps) => {
  const [products, setProducts] = useState<StorageProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCount, setNewCount] = useState("");

  const isProprietor = userRole === "Proprietor";

  const fetchProducts = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("storage_products")
      .select("id, name, price, count")
      .eq("company_id", companyId)
      .order("name");
    if (!error && data) setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [companyId]);

  const handleAdd = async () => {
    if (!companyId) return;
    const name = newName.trim().toUpperCase();
    const price = parseFloat(newPrice) || 0;
    const count = parseInt(newCount) || 0;
    if (!name || price <= 0) return;

    const { error } = await supabase.from("storage_products").insert({
      company_id: companyId,
      name,
      price,
      count,
    });

    if (error) {
      toast.error("Failed to add product: " + error.message);
      return;
    }

    toast.success("Product added");
    setNewName("");
    setNewPrice("");
    setNewCount("");
    setShowAddDialog(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("storage_products").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete: " + error.message);
      return;
    }
    toast.success("Product deleted");
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleCountChange = async (id: string, newCount: number) => {
    const { error } = await supabase
      .from("storage_products")
      .update({ count: newCount })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update count");
      return;
    }
    setProducts(prev => prev.map(p => p.id === id ? { ...p, count: newCount } : p));
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Oil / Product Stock
          </span>
          <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Product
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground text-sm">No products added yet.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_100px_80px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
              <span>Name</span>
              <span>Price (₹)</span>
              <span>Count</span>
              <span></span>
            </div>
            {products.map((p) => (
              <div key={p.id} className="grid grid-cols-[1fr_100px_80px_40px] gap-2 items-center">
                <span className="text-sm font-medium truncate">{p.name}</span>
                <span className="text-sm">₹{p.price.toFixed(2)}</span>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={p.count === 0 ? "" : p.count}
                  onChange={(e) => handleCountChange(p.id, parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                />
                {isProprietor && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(p.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Product Name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. CASTROL 1Ltr" />
            </div>
            <div>
              <Label>Price per unit (₹)</Label>
              <Input type="number" step="0.01" min="0" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Count</Label>
              <Input type="number" min="0" value={newCount} onChange={e => setNewCount(e.target.value)} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newName.trim() || !newPrice}>Add Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default StorageProductList;
