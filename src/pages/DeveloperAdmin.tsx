import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Shield, Building2, RefreshCcw, Trash2, Plus, KeyRound, ArrowLeft, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const companySchema = z.object({
  companyName: z.string().trim().min(2, "Company name is required").max(120),
  ownerEmail: z.string().trim().email("Valid owner email is required").max(255),
  ownerPassword: z.string().min(8, "Owner password must be at least 8 characters").max(72),
  contactPhone: z.string().trim().max(40).optional(),
  proprietorPassword: z.string().trim().min(1, "Proprietor password is required").max(100),
  supervisorPassword: z.string().trim().min(1, "Supervisor password is required").max(100),
  petrolPrice: z.coerce.number().min(0, "Petrol price must be 0 or more"),
  dieselPrice: z.coerce.number().min(0, "Diesel price must be 0 or more"),
  pumpCountPetrol: z.coerce.number().int().min(1).max(20),
  pumpCountDiesel: z.coerce.number().int().min(1).max(20),
});

type CompanyForm = z.infer<typeof companySchema>;

type CompanyRecord = {
  id: string;
  name: string;
  contact_phone: string | null;
  petrol_price: number;
  diesel_price: number;
  pump_count_petrol: number;
  pump_count_diesel: number;
  created_at: string;
  linked_users: number;
  primary_email: string | null;
};

const defaultFormValues: CompanyForm = {
  companyName: "",
  ownerEmail: "",
  ownerPassword: "",
  contactPhone: "",
  proprietorPassword: "",
  supervisorPassword: "",
  petrolPrice: 101.88,
  dieselPrice: 93.48,
  pumpCountPetrol: 2,
  pumpCountDiesel: 2,
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
      throw new Error(error.message || "Request failed");
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

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-[var(--shadow-card)] md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="w-fit">
              <ArrowLeft className="h-4 w-4" />
              Back
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
                  <Label htmlFor="developer-password">Developer password</Label>
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
                                    This removes company data, daily records, bills, employees, and company-user links. Auth accounts are kept.
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
  );
};

export default DeveloperAdmin;