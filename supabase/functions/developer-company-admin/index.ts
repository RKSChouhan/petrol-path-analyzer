import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const baseSchema = z.object({
  password: z.string().min(1),
  action: z.enum(["listCompanies", "createCompany", "deleteCompany", "updateCompany"]),
});

const createCompanySchema = baseSchema.extend({
  action: z.literal("createCompany"),
  companyName: z.string().trim().min(2).max(120),
  ownerEmail: z.string().trim().email().max(255),
  ownerPassword: z.string().min(8).max(72),
  ownerEmail2: z.string().trim().email().max(255).optional(),
  ownerPassword2: z.string().min(8).max(72).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  contactPhone2: z.string().trim().max(40).optional(),
  proprietorPassword: z.string().trim().min(1).max(100),
  supervisorPassword: z.string().trim().min(1).max(100),
  petrolPrice: z.coerce.number().min(0).max(10000),
  dieselPrice: z.coerce.number().min(0).max(10000),
  pumpCountPetrol: z.coerce.number().int().min(1).max(20),
  pumpCountDiesel: z.coerce.number().int().min(1).max(20),
  cashierGroupCount: z.coerce.number().int().min(1).max(10).optional(),
  logoUrl: z.string().trim().max(500).optional(),
});

const deleteCompanySchema = baseSchema.extend({
  action: z.literal("deleteCompany"),
  companyId: z.string().uuid(),
});

const updateCompanySchema = baseSchema.extend({
  action: z.literal("updateCompany"),
  companyId: z.string().uuid(),
  petrolPrice: z.coerce.number().min(0).max(10000).optional(),
  dieselPrice: z.coerce.number().min(0).max(10000).optional(),
  pumpCountPetrol: z.coerce.number().int().min(1).max(20).optional(),
  pumpCountDiesel: z.coerce.number().int().min(1).max(20).optional(),
  cashierGroupCount: z.coerce.number().int().min(1).max(10).optional(),
  proprietorPassword: z.string().trim().min(1).max(100).optional(),
  supervisorPassword: z.string().trim().min(1).max(100).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  companyName: z.string().trim().min(2).max(120).optional(),
  ownerPassword: z.string().min(8).max(72).optional(),
  ownerPassword2: z.string().min(8).max(72).optional(),
  logoUrl: z.string().trim().max(500).optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function listCompanies() {
  const { data: companies, error: companiesError } = await admin
    .from("companies")
    .select("id, name, contact_phone, petrol_price, diesel_price, pump_count_petrol, pump_count_diesel, cashier_group_count, logo_url, created_at")
    .order("created_at", { ascending: false });

  if (companiesError) throw new Error(companiesError.message);

  const { data: mappings, error: mappingsError } = await admin
    .from("user_companies")
    .select("company_id, user_id");

  if (mappingsError) throw new Error(mappingsError.message);

  const userIds = [...new Set((mappings ?? []).map((m) => m.user_id))];

  const { data: profiles, error: profilesError } = userIds.length
    ? await admin.from("profiles").select("user_id, email").in("user_id", userIds)
    : { data: [], error: null };

  if (profilesError) throw new Error(profilesError.message);

  const emailByUserId = new Map((profiles ?? []).map((p) => [p.user_id, p.email]));
  const usersByCompanyId = new Map<string, string[]>();

  for (const m of mappings ?? []) {
    const current = usersByCompanyId.get(m.company_id) ?? [];
    current.push(m.user_id);
    usersByCompanyId.set(m.company_id, current);
  }

  return (companies ?? []).map((company) => {
    const linkedUsers = usersByCompanyId.get(company.id) ?? [];
    return {
      ...company,
      linked_users: linkedUsers.length,
      primary_email: linkedUsers.length ? emailByUserId.get(linkedUsers[0]) ?? null : null,
      secondary_email: linkedUsers.length > 1 ? emailByUserId.get(linkedUsers[1]) ?? null : null,
    };
  });
}

async function findUserIdByEmail(email: string) {
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match.id;
    if (!data.nextPage) break;
    page = data.nextPage;
  }
  return null;
}

async function resolveOrCreateOwner(email: string, password: string): Promise<{ userId: string; created: boolean }> {
  const normalizedEmail = email.trim().toLowerCase();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("user_id")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (existingProfile?.user_id) {
    return { userId: existingProfile.user_id, created: false };
  }

  const { data: ownerResult, error: ownerError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
  });

  if (ownerError || !ownerResult.user) {
    const isExisting = ownerError?.message?.toLowerCase().includes("already been registered") ?? false;
    if (isExisting) {
      const uid = await findUserIdByEmail(normalizedEmail);
      if (uid) return { userId: uid, created: false };
    }
    throw new AppError(ownerError?.message || "Unable to create owner account");
  }

  return { userId: ownerResult.user.id, created: true };
}

async function createCompany(payload: z.infer<typeof createCompanySchema>) {
  const normalizedOwnerEmail = payload.ownerEmail.trim().toLowerCase();
  const normalizedOwnerEmail2 = payload.ownerEmail2?.trim().toLowerCase() || null;

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({
      name: payload.companyName,
      contact_phone: payload.contactPhone?.trim() || null,
      petrol_price: payload.petrolPrice,
      diesel_price: payload.dieselPrice,
      pump_count_petrol: payload.pumpCountPetrol,
      pump_count_diesel: payload.pumpCountDiesel,
      cashier_group_count: payload.cashierGroupCount || 2,
      proprietor_password: payload.proprietorPassword,
      supervisor_password: payload.supervisorPassword,
      logo_url: payload.logoUrl?.trim() || null,
      default_expenses: [],
      default_debtors: [],
    })
    .select("id, name, contact_phone, petrol_price, diesel_price, pump_count_petrol, pump_count_diesel, cashier_group_count, logo_url, created_at")
    .single();

  if (companyError || !company) throw new Error(companyError?.message || "Unable to create company");

  const createdUserIds: string[] = [];

  const cleanup = async () => {
    for (const uid of createdUserIds) {
      await admin.from("user_roles").delete().eq("user_id", uid);
      await admin.from("user_companies").delete().eq("user_id", uid).eq("company_id", company.id);
      await admin.from("profiles").delete().eq("user_id", uid);
      await admin.auth.admin.deleteUser(uid);
    }
    await admin.from("lock_settings").delete().eq("company_id", company.id);
    await admin.from("companies").delete().eq("id", company.id);
  };

  try {
    // Owner 1
    const owner1 = await resolveOrCreateOwner(normalizedOwnerEmail, payload.ownerPassword);
    if (owner1.created) createdUserIds.push(owner1.userId);

    await admin.from("profiles").upsert({ user_id: owner1.userId, email: normalizedOwnerEmail }, { onConflict: "user_id" });
    await admin.from("user_companies").insert({ user_id: owner1.userId, company_id: company.id });
    await admin.from("user_roles").upsert({ user_id: owner1.userId, role: "Proprietor" }, { onConflict: "user_id,role" });

    // Owner 2 (optional)
    let owner2Email: string | null = null;
    if (normalizedOwnerEmail2 && payload.ownerPassword2) {
      const owner2 = await resolveOrCreateOwner(normalizedOwnerEmail2, payload.ownerPassword2);
      if (owner2.created) createdUserIds.push(owner2.userId);

      await admin.from("profiles").upsert({ user_id: owner2.userId, email: normalizedOwnerEmail2 }, { onConflict: "user_id" });
      await admin.from("user_companies").insert({ user_id: owner2.userId, company_id: company.id });
      await admin.from("user_roles").upsert({ user_id: owner2.userId, role: "Proprietor" }, { onConflict: "user_id,role" });
      owner2Email = normalizedOwnerEmail2;
    }

    await admin.from("lock_settings").insert({
      company_id: company.id,
      proprietor_locked: false,
      supervisor_locked: false,
      updated_by: owner1.userId,
    });

    return {
      ...company,
      linked_users: owner2Email ? 2 : 1,
      primary_email: normalizedOwnerEmail,
      secondary_email: owner2Email,
    };
  } catch (err) {
    await cleanup();
    throw err;
  }
}

async function deleteByCompanyId(table: string, companyId: string) {
  const { error } = await admin.from(table).delete().eq("company_id", companyId);
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function deleteByDailySalesIds(table: string, dailySalesIds: string[]) {
  if (!dailySalesIds.length) return;
  const { error } = await admin.from(table).delete().in("daily_sales_id", dailySalesIds);
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function deleteCompany(companyId: string) {
  const { data: linkedUsers, error: linkedUsersError } = await admin
    .from("user_companies")
    .select("user_id")
    .eq("company_id", companyId);

  if (linkedUsersError) throw new Error(linkedUsersError.message);

  const { data: dailySales, error: dailySalesError } = await admin
    .from("daily_sales")
    .select("id")
    .eq("company_id", companyId);

  if (dailySalesError) throw new Error(dailySalesError.message);

  const dailySalesIds = (dailySales ?? []).map((e) => e.id);

  await deleteByDailySalesIds("daily_attendance", dailySalesIds);
  await deleteByDailySalesIds("pump_readings", dailySalesIds);
  await deleteByDailySalesIds("oil_sales", dailySalesIds);
  await deleteByDailySalesIds("payment_methods", dailySalesIds);
  await deleteByDailySalesIds("cash_denominations", dailySalesIds);
  await deleteByDailySalesIds("expenses", dailySalesIds);
  await deleteByDailySalesIds("debtors", dailySalesIds);
  await deleteByDailySalesIds("repaid_debtors", dailySalesIds);

  await deleteByCompanyId("storage_readings", companyId);
  await deleteByCompanyId("storage_products", companyId);
  await deleteByCompanyId("fiserv_bills", companyId);
  await deleteByCompanyId("bharat_fleet_bills", companyId);
  await deleteByCompanyId("debtor_ledger", companyId);
  await deleteByCompanyId("employees", companyId);
  await deleteByCompanyId("lock_settings", companyId);

  const { error: deleteSalesError } = await admin.from("daily_sales").delete().eq("company_id", companyId);
  if (deleteSalesError) throw new Error(deleteSalesError.message);

  const userIds = [...new Set((linkedUsers ?? []).map((u) => u.user_id))];

  const { error: deleteMappingsError } = await admin.from("user_companies").delete().eq("company_id", companyId);
  if (deleteMappingsError) throw new Error(deleteMappingsError.message);

  const { error: deleteCompanyError } = await admin.from("companies").delete().eq("id", companyId);
  if (deleteCompanyError) throw new Error(deleteCompanyError.message);

  if (userIds.length) {
    const { data: remainingMappings, error: remainingMappingsError } = await admin
      .from("user_companies")
      .select("user_id")
      .in("user_id", userIds);

    if (remainingMappingsError) throw new Error(remainingMappingsError.message);

    const remainingUserIds = new Set((remainingMappings ?? []).map((r) => r.user_id));
    const orphanedUserIds = userIds.filter((uid) => !remainingUserIds.has(uid));

    if (orphanedUserIds.length) {
      const { error: deleteRolesError } = await admin.from("user_roles").delete().in("user_id", orphanedUserIds);
      if (deleteRolesError) throw new Error(deleteRolesError.message);

      const { error: deleteProfilesError } = await admin.from("profiles").delete().in("user_id", orphanedUserIds);
      if (deleteProfilesError) throw new Error(deleteProfilesError.message);

      for (const uid of orphanedUserIds) {
        await admin.auth.admin.deleteUser(uid);
      }
    }
  }

  return "Company and linked auth accounts removed successfully.";
}

async function updateCompany(payload: z.infer<typeof updateCompanySchema>) {
  const updates: Record<string, unknown> = {};
  if (payload.petrolPrice !== undefined) updates.petrol_price = payload.petrolPrice;
  if (payload.dieselPrice !== undefined) updates.diesel_price = payload.dieselPrice;
  if (payload.pumpCountPetrol !== undefined) updates.pump_count_petrol = payload.pumpCountPetrol;
  if (payload.pumpCountDiesel !== undefined) updates.pump_count_diesel = payload.pumpCountDiesel;
  if (payload.cashierGroupCount !== undefined) updates.cashier_group_count = payload.cashierGroupCount;
  if (payload.proprietorPassword !== undefined) updates.proprietor_password = payload.proprietorPassword;
  if (payload.supervisorPassword !== undefined) updates.supervisor_password = payload.supervisorPassword;
  if (payload.contactPhone !== undefined) updates.contact_phone = payload.contactPhone.trim() || null;
  if (payload.companyName !== undefined) updates.name = payload.companyName;
  if (payload.logoUrl !== undefined) updates.logo_url = payload.logoUrl.trim() || null;

  const hasCompanyUpdates = Object.keys(updates).length > 0;
  const hasOwnerPasswordUpdate = !!payload.ownerPassword;
  const hasOwner2PasswordUpdate = !!payload.ownerPassword2;

  if (!hasCompanyUpdates && !hasOwnerPasswordUpdate && !hasOwner2PasswordUpdate) {
    throw new AppError("No fields to update", 400);
  }

  if (hasCompanyUpdates) {
    const { error } = await admin.from("companies").update(updates).eq("id", payload.companyId);
    if (error) throw new Error(error.message);
  }

  // Get all linked users for password updates
  if (hasOwnerPasswordUpdate || hasOwner2PasswordUpdate) {
    const { data: mappings, error: mappingsError } = await admin
      .from("user_companies")
      .select("user_id")
      .eq("company_id", payload.companyId);
    if (mappingsError) throw new Error(mappingsError.message);

    if (!mappings || mappings.length === 0) {
      throw new AppError("No owners found for this company", 404);
    }

    if (hasOwnerPasswordUpdate && mappings[0]) {
      const { error: pwError } = await admin.auth.admin.updateUserById(mappings[0].user_id, {
        password: payload.ownerPassword,
      });
      if (pwError) throw new AppError(pwError.message, 400);
    }

    if (hasOwner2PasswordUpdate && mappings[1]) {
      const { error: pwError } = await admin.auth.admin.updateUserById(mappings[1].user_id, {
        password: payload.ownerPassword2,
      });
      if (pwError) throw new AppError(pwError.message, 400);
    }
  }

  return "Company updated successfully";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parsedBase = baseSchema.safeParse(body);

    if (!parsedBase.success) {
      return json({ error: parsedBase.error.issues[0]?.message ?? "Invalid request" }, 400);
    }

    const developerPassword = Deno.env.get("DEVELOPER_ADMIN_PASSWORD");
    if (!developerPassword || parsedBase.data.password !== developerPassword) {
      return json({ error: "Invalid developer password" }, 401);
    }

    if (parsedBase.data.action === "listCompanies") {
      const companies = await listCompanies();
      return json({ companies });
    }

    if (parsedBase.data.action === "createCompany") {
      const parsedCreate = createCompanySchema.safeParse(body);
      if (!parsedCreate.success) {
        return json({ error: parsedCreate.error.issues[0]?.message ?? "Invalid company details" }, 400);
      }
      const company = await createCompany(parsedCreate.data);
      return json({ company }, 201);
    }

    if (parsedBase.data.action === "updateCompany") {
      const parsedUpdate = updateCompanySchema.safeParse(body);
      if (!parsedUpdate.success) {
        return json({ error: parsedUpdate.error.issues[0]?.message ?? "Invalid update details" }, 400);
      }
      const message = await updateCompany(parsedUpdate.data);
      return json({ message });
    }

    const parsedDelete = deleteCompanySchema.safeParse(body);
    if (!parsedDelete.success) {
      return json({ error: parsedDelete.error.issues[0]?.message ?? "Invalid company id" }, 400);
    }

    const message = await deleteCompany(parsedDelete.data.companyId);
    return json({ message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = error instanceof AppError ? error.status : 500;
    return json({ error: message }, status);
  }
});
