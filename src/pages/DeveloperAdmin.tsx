import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Shield, Building2, RefreshCcw, Trash2, Plus, KeyRound, LogIn, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const companySchema = z.object({
  companyName: z.string().trim().min(2, "Company name is required").max(120),
  ownerEmail: z.string().trim().email("Valid owner email is required").max(255),
  ownerPassword: z.string().min(8, "Owner password must be at least 8 characters").max(72),
  ownerEmail2: z.string().trim().max(255).optional(),
  ownerPassword2: z.string().max(72).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  contactPhone2: z.string().trim().max(40).optional(),
  proprietorPassword: z.string().trim().min(1, "Proprietor password is required").max(100),
  supervisorPassword: z.string().trim().min(1, "Supervisor password is required").max(100),
  petrolPrice: z.coerce.number().min(0, "Petrol price must be 0 or more"),
  dieselPrice: z.coerce.number().min(0, "Diesel price must be 0 or more"),
  pumpCountPetrol: z.coerce.number().int().min(1).max(20),
  pumpCountDiesel: z.coerce.number().int().min(1).max(20),
  cashierGroupCount: z.coerce.number().int().min(1).max(10),
  logoUrl: z.string().trim().max(500).optional(),
}).refine((data) => {
  if (data.ownerEmail2 && data.ownerEmail2.length > 0 && (!data.ownerPassword2 || data.ownerPassword2.length < 8)) {
    return false;
  }
  return true;
}, { message: "Owner 2 password must be at least 8 characters", path: ["ownerPassword2"] });

type CompanyForm = z.infer<typeof companySchema>;

type CompanyRecord = {
  id: string;
  name: string;
  contact_phone: string | null;
  petrol_price: number;
  diesel_price: number;
  pump_count_petrol: number;
  pump_count_diesel: number;
  cashier_group_count: number;
  logo_url: string | null;
  created_at: string;
  linked_users: number;
  primary_email: string | null;
};

const defaultFormValues: CompanyForm = {
  companyName: "",
  ownerEmail: "",
  ownerPassword: "",
  ownerEmail2: "",
  ownerPassword2: "",
  contactPhone: "",
  contactPhone2: "",
  proprietorPassword: "",
  supervisorPassword: "",
  petrolPrice: 101.88,
  dieselPrice: 93.48,
  pumpCountPetrol: 2,
  pumpCountDiesel: 2,
  cashierGroupCount: 2,
  logoUrl: "",
};

type EditForm = {
  companyName: string;
  contactPhone: string;
  petrolPrice: number;
  dieselPrice: number;
  pumpCountPetrol: number;
  pumpCountDiesel: number;
  cashierGroupCount: number;
  proprietorPassword: string;
  supervisorPassword: string;
  ownerPassword: string;
  logoUrl: string;
};

const DeveloperAdmin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [form, setForm] = useState<CompanyForm>(defaultFormValues);
  const [editingCompany, setEditingCompany] = useState<CompanyRecord | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  // Only allow access if navigated from login page via the logo tap flow
  useEffect(() => {
    const hasAccess = sessionStorage.getItem("developerAccess");
    if (!hasAccess) {
      navigate("/login", { replace: true });
      return;
    }
    // Clear the flag on refresh (reload clears it naturally since we check on mount)
    const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (navEntries.length > 0 && navEntries[0].type === "reload") {
      sessionStorage.removeItem("developerAccess");
      navigate("/login", { replace: true });
      return;
    }
  }, [navigate]);

  const companyCount = useMemo(() => companies.length, [companies]);

  const invokeAdmin = async <T,>(action: string, payload?: Record<string, unknown>): Promise<T> => {
    const { data, error } = await supabase.functions.invoke("developer-company-admin", {
      body: {
        action,
        password,
        ...payload,
      },
    });

    if (error) {
      const fallbackMessage = error.message || "Request failed";
      const responseContext = (error as { context?: Response }).context;

      if (responseContext instanceof Response) {
        try {
          const body = await responseContext.clone().json() as { error?: string; message?: string };
          const detail = body.error || body.message;
          if (detail) throw new Error(detail);
        } catch (innerErr) {
          if (innerErr instanceof Error && innerErr.message !== fallbackMessage) throw innerErr;
        }
      }

      throw new Error(fallbackMessage);
    }

    return data as T;
  };

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const response = await invokeAdmin<{ companies: CompanyRecord[] }>("listCompanies");
      setCompanies(response.companies ?? []);
      setUnlocked(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load companies";
      toast({
        title: "Access denied",
        description: message,
        variant: "destructive",
      });
      setUnlocked(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Developer Admin";
  }, []);

  const handleUnlock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password.trim()) {
      toast({
        title: "Password required",
        description: "Enter the developer password to continue.",
        variant: "destructive",
      });
      return;
    }

    await loadCompanies();
  };

  const handleFieldChange = <K extends keyof CompanyForm>(field: K, value: CompanyForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateCompany = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = companySchema.safeParse(form);

    if (!parsed.success) {
      toast({
        title: "Check the form",
        description: parsed.error.issues[0]?.message ?? "Please review the company details.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await invokeAdmin<{ company: CompanyRecord }>("createCompany", parsed.data);
      toast({
        title: "Company created",
        description: "The company and owner account were created successfully.",
      });
      setForm({
        ...defaultFormValues,
        petrolPrice: parsed.data.petrolPrice,
        dieselPrice: parsed.data.dieselPrice,
        pumpCountPetrol: parsed.data.pumpCountPetrol,
        pumpCountDiesel: parsed.data.pumpCountDiesel,
      });
      await loadCompanies();
    } catch (error) {
      toast({
        title: "Create failed",
        description: error instanceof Error ? error.message : "Unable to create company.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    setSubmitting(true);
    try {
      const response = await invokeAdmin<{ message: string }>("deleteCompany", { companyId });
      toast({
        title: "Company deleted",
        description: response.message,
      });
      await loadCompanies();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete company.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (company: CompanyRecord) => {
    setEditingCompany(company);
    setEditForm({
      companyName: company.name,
      contactPhone: company.contact_phone || "",
      petrolPrice: company.petrol_price,
      dieselPrice: company.diesel_price,
      pumpCountPetrol: company.pump_count_petrol,
      pumpCountDiesel: company.pump_count_diesel,
      cashierGroupCount: company.cashier_group_count || 2,
      proprietorPassword: "",
      supervisorPassword: "",
      ownerPassword: "",
      logoUrl: company.logo_url || "",
    });
  };

  const handleUpdateCompany = async () => {
    if (!editingCompany || !editForm) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { companyId: editingCompany.id };
      if (editForm.companyName !== editingCompany.name) payload.companyName = editForm.companyName;
      if (editForm.contactPhone !== (editingCompany.contact_phone || "")) payload.contactPhone = editForm.contactPhone;
      if (editForm.petrolPrice !== editingCompany.petrol_price) payload.petrolPrice = editForm.petrolPrice;
      if (editForm.dieselPrice !== editingCompany.diesel_price) payload.dieselPrice = editForm.dieselPrice;
      if (editForm.pumpCountPetrol !== editingCompany.pump_count_petrol) payload.pumpCountPetrol = editForm.pumpCountPetrol;
      if (editForm.pumpCountDiesel !== editingCompany.pump_count_diesel) payload.pumpCountDiesel = editForm.pumpCountDiesel;
      if (editForm.cashierGroupCount !== (editingCompany.cashier_group_count || 2)) payload.cashierGroupCount = editForm.cashierGroupCount;
      if (editForm.logoUrl !== (editingCompany.logo_url || "")) payload.logoUrl = editForm.logoUrl;
      if (editForm.proprietorPassword) payload.proprietorPassword = editForm.proprietorPassword;
      if (editForm.supervisorPassword) payload.supervisorPassword = editForm.supervisorPassword;
      if (editForm.ownerPassword) payload.ownerPassword = editForm.ownerPassword;

      if (Object.keys(payload).length <= 1) {
        toast({ title: "No changes", description: "Nothing was modified." });
        return;
      }

      await invokeAdmin<{ message: string }>("updateCompany", payload);
      toast({ title: "Company updated", description: "Changes saved successfully." });
      setEditingCompany(null);
      setEditForm(null);
      await loadCompanies();
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unable to update company.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-[var(--shadow-card)] md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/login")} className="w-fit">
              <LogIn className="h-4 w-4" />
              Login Page
            </Button>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-sm text-secondary-foreground">
              <Shield className="h-4 w-4" />
              Developer Console
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Tenant Management</h1>
              <p className="text-sm text-muted-foreground">
                Create, review, and remove companies from one protected admin page.
              </p>
            </div>
          </div>

          {unlocked && (
            <div className="flex items-center gap-3">
              <div className="rounded-xl border bg-secondary px-4 py-3 text-sm text-secondary-foreground">
                <span className="font-semibold text-foreground">{companyCount}</span> companies
              </div>
              <Button variant="outline" onClick={loadCompanies} disabled={loading || submitting}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          )}
        </header>

        {!unlocked ? (
          <Card className="mx-auto w-full max-w-lg shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <KeyRound className="h-5 w-5" />
                Enter developer password
              </CardTitle>
              <CardDescription>Access is checked server-side before any company data is shown.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleUnlock}>
                <div className="space-y-2">
                  <Label htmlFor="developer-password">Developer password (last 4 abp)</Label>
                  <Input
                    id="developer-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                </div>
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? "Checking access..." : "Open developer page"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Plus className="h-5 w-5" />
                  Add new company
                </CardTitle>
                <CardDescription>
                  This creates the company, owner login, company mapping, proprietor role, and lock settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateCompany}>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="companyName">Company name</Label>
                    <Input id="companyName" value={form.companyName} onChange={(event) => handleFieldChange("companyName", event.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ownerEmail">Owner email</Label>
                    <Input id="ownerEmail" type="email" value={form.ownerEmail} onChange={(event) => handleFieldChange("ownerEmail", event.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ownerPassword">Owner login password</Label>
                    <Input id="ownerPassword" type="password" value={form.ownerPassword} onChange={(event) => handleFieldChange("ownerPassword", event.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="proprietorPassword">Proprietor role password</Label>
                    <Input id="proprietorPassword" value={form.proprietorPassword} onChange={(event) => handleFieldChange("proprietorPassword", event.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supervisorPassword">Supervisor role password</Label>
                    <Input id="supervisorPassword" value={form.supervisorPassword} onChange={(event) => handleFieldChange("supervisorPassword", event.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Contact phone</Label>
                    <Input id="contactPhone" value={form.contactPhone ?? ""} onChange={(event) => handleFieldChange("contactPhone", event.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="petrolPrice">Petrol price</Label>
                    <Input id="petrolPrice" type="number" min="0" step="0.01" value={form.petrolPrice} onChange={(event) => handleFieldChange("petrolPrice", Number(event.target.value))} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dieselPrice">Diesel price</Label>
                    <Input id="dieselPrice" type="number" min="0" step="0.01" value={form.dieselPrice} onChange={(event) => handleFieldChange("dieselPrice", Number(event.target.value))} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pumpCountPetrol">Petrol pumps</Label>
                    <Input id="pumpCountPetrol" type="number" min="1" step="1" value={form.pumpCountPetrol} onChange={(event) => handleFieldChange("pumpCountPetrol", Number(event.target.value))} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pumpCountDiesel">Diesel pumps</Label>
                    <Input id="pumpCountDiesel" type="number" min="1" step="1" value={form.pumpCountDiesel} onChange={(event) => handleFieldChange("pumpCountDiesel", Number(event.target.value))} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cashierGroupCount">Cashier groups (Payment & Cash)</Label>
                    <Input id="cashierGroupCount" type="number" min="1" max="10" step="1" value={form.cashierGroupCount} onChange={(event) => handleFieldChange("cashierGroupCount", Number(event.target.value))} />
                  </div>

                  <div className="md:col-span-2">
                    <Button className="w-full" type="submit" disabled={submitting || loading}>
                      {submitting ? "Creating company..." : "Create company"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Building2 className="h-5 w-5" />
                  Existing companies
                </CardTitle>
                <CardDescription>
                  Deleting a company removes its operational records and company links, but leaves auth accounts intact.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {companies.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-secondary/50 p-6 text-sm text-muted-foreground">
                    No companies found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Fuel</TableHead>
                        <TableHead className="w-[100px] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-foreground">{company.name}</div>
                              <div className="text-xs text-muted-foreground">{company.contact_phone || "No contact"}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{company.primary_email || "—"}</TableCell>
                          <TableCell>{company.linked_users}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            P {company.petrol_price} / D {company.diesel_price}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="outline" size="icon" onClick={() => openEditDialog(company)} disabled={submitting || loading}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="icon" disabled={submitting || loading}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete {company.name}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This removes company data, daily records, bills, employees, company-user links, and associated auth accounts.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteCompany(company.id)}>
                                      Delete company
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>

    <Dialog open={!!editingCompany} onOpenChange={(open) => { if (!open) { setEditingCompany(null); setEditForm(null); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {editingCompany?.name}</DialogTitle>
          <DialogDescription>Update company settings. Leave password fields blank to keep current passwords.</DialogDescription>
        </DialogHeader>
        {editForm && (
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Company name</Label>
              <Input value={editForm.companyName} onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contact phone</Label>
              <Input value={editForm.contactPhone} onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Petrol price</Label>
                <Input type="number" min="0" step="0.01" value={editForm.petrolPrice} onChange={(e) => setEditForm({ ...editForm, petrolPrice: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Diesel price</Label>
                <Input type="number" min="0" step="0.01" value={editForm.dieselPrice} onChange={(e) => setEditForm({ ...editForm, dieselPrice: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Petrol pumps</Label>
                <Input type="number" min="1" step="1" value={editForm.pumpCountPetrol} onChange={(e) => setEditForm({ ...editForm, pumpCountPetrol: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Diesel pumps</Label>
                <Input type="number" min="1" step="1" value={editForm.pumpCountDiesel} onChange={(e) => setEditForm({ ...editForm, pumpCountDiesel: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cashier groups</Label>
              <Input type="number" min="1" max="10" step="1" value={editForm.cashierGroupCount} onChange={(e) => setEditForm({ ...editForm, cashierGroupCount: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Company logo URL</Label>
              <Input placeholder="Leave blank for default" value={editForm.logoUrl} onChange={(e) => setEditForm({ ...editForm, logoUrl: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Proprietor password</Label>
                <Input placeholder="Leave blank to keep" value={editForm.proprietorPassword} onChange={(e) => setEditForm({ ...editForm, proprietorPassword: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Supervisor password</Label>
                <Input placeholder="Leave blank to keep" value={editForm.supervisorPassword} onChange={(e) => setEditForm({ ...editForm, supervisorPassword: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Owner login password</Label>
              <Input type="password" placeholder="Leave blank to keep" value={editForm.ownerPassword} onChange={(e) => setEditForm({ ...editForm, ownerPassword: e.target.value })} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { setEditingCompany(null); setEditForm(null); }}>Cancel</Button>
          <Button onClick={handleUpdateCompany} disabled={submitting}>{submitting ? "Saving..." : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default DeveloperAdmin;