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
  contactPhone: z.string().trim().max(40).optional(),
  proprietorPassword: z.string().trim().min(1).max(100),
  supervisorPassword: z.string().trim().min(1).max(100),
  petrolPrice: z.coerce.number().min(0).max(10000),
  dieselPrice: z.coerce.number().min(0).max(10000),
  pumpCountPetrol: z.coerce.number().int().min(1).max(20),
  pumpCountDiesel: z.coerce.number().int().min(1).max(20),
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
  proprietorPassword: z.string().trim().min(1).max(100).optional(),
  supervisorPassword: z.string().trim().min(1).max(100).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  companyName: z.string().trim().min(2).max(120).optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function listCompanies() {
  const { data: companies, error: companiesError } = await admin
    .from("companies")
    .select("id, name, contact_phone, petrol_price, diesel_price, pump_count_petrol, pump_count_diesel, created_at")
    .order("created_at", { ascending: false });

  if (companiesError) throw new Error(companiesError.message);

  const { data: mappings, error: mappingsError } = await admin
    .from("user_companies")
    .select("company_id, user_id");

  if (mappingsError) throw new Error(mappingsError.message);

  const userIds = [...new Set((mappings ?? []).map((mapping) => mapping.user_id))];

  const { data: profiles, error: profilesError } = userIds.length
    ? await admin.from("profiles").select("user_id, email").in("user_id", userIds)
    : { data: [], error: null };

  if (profilesError) throw new Error(profilesError.message);

  const emailByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.email]));
  const usersByCompanyId = new Map<string, string[]>();

  for (const mapping of mappings ?? []) {
    const current = usersByCompanyId.get(mapping.company_id) ?? [];
    current.push(mapping.user_id);
    usersByCompanyId.set(mapping.company_id, current);
  }

  return (companies ?? []).map((company) => {
    const linkedUsers = usersByCompanyId.get(company.id) ?? [];
    return {
      ...company,
      linked_users: linkedUsers.length,
      primary_email: linkedUsers.length ? emailByUserId.get(linkedUsers[0]) ?? null : null,
    };
  });
}

async function createCompany(payload: z.infer<typeof createCompanySchema>) {
  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({
      name: payload.companyName,
      contact_phone: payload.contactPhone?.trim() || null,
      petrol_price: payload.petrolPrice,
      diesel_price: payload.dieselPrice,
      pump_count_petrol: payload.pumpCountPetrol,
      pump_count_diesel: payload.pumpCountDiesel,
      proprietor_password: payload.proprietorPassword,
      supervisor_password: payload.supervisorPassword,
    })
    .select("id, name, contact_phone, petrol_price, diesel_price, pump_count_petrol, pump_count_diesel, created_at")
    .single();

  if (companyError || !company) throw new Error(companyError?.message || "Unable to create company");

  const { data: ownerResult, error: ownerError } = await admin.auth.admin.createUser({
    email: payload.ownerEmail,
    password: payload.ownerPassword,
    email_confirm: true,
  });

  if (ownerError || !ownerResult.user) {
    await admin.from("companies").delete().eq("id", company.id);
    throw new Error(ownerError?.message || "Unable to create owner account");
  }

  const ownerId = ownerResult.user.id;

  const cleanup = async () => {
    await admin.from("user_roles").delete().eq("user_id", ownerId);
    await admin.from("user_companies").delete().eq("user_id", ownerId).eq("company_id", company.id);
    await admin.from("profiles").delete().eq("user_id", ownerId);
    await admin.from("lock_settings").delete().eq("company_id", company.id);
    await admin.from("companies").delete().eq("id", company.id);
    await admin.auth.admin.deleteUser(ownerId);
  };

  const { error: profileError } = await admin.from("profiles").insert({
    user_id: ownerId,
    email: payload.ownerEmail,
  });

  if (profileError) {
    await cleanup();
    throw new Error(profileError.message);
  }

  const { error: mappingError } = await admin.from("user_companies").insert({
    user_id: ownerId,
    company_id: company.id,
  });

  if (mappingError) {
    await cleanup();
    throw new Error(mappingError.message);
  }

  const { error: roleError } = await admin.from("user_roles").insert({
    user_id: ownerId,
    role: "Proprietor",
  });

  if (roleError) {
    await cleanup();
    throw new Error(roleError.message);
  }

  const { error: lockError } = await admin.from("lock_settings").insert({
    company_id: company.id,
    proprietor_locked: false,
    supervisor_locked: false,
    updated_by: ownerId,
  });

  if (lockError) {
    await cleanup();
    throw new Error(lockError.message);
  }

  return {
    ...company,
    linked_users: 1,
    primary_email: payload.ownerEmail,
  };
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

  const dailySalesIds = (dailySales ?? []).map((entry) => entry.id);

  await deleteByDailySalesIds("daily_attendance", dailySalesIds);
  await deleteByDailySalesIds("pump_readings", dailySalesIds);
  await deleteByDailySalesIds("oil_sales", dailySalesIds);
  await deleteByDailySalesIds("payment_methods", dailySalesIds);
  await deleteByDailySalesIds("cash_denominations", dailySalesIds);
  await deleteByDailySalesIds("expenses", dailySalesIds);
  await deleteByDailySalesIds("debtors", dailySalesIds);
  await deleteByDailySalesIds("repaid_debtors", dailySalesIds);

  await deleteByCompanyId("storage_readings", companyId);
  await deleteByCompanyId("fiserv_bills", companyId);
  await deleteByCompanyId("bharat_fleet_bills", companyId);
  await deleteByCompanyId("debtor_ledger", companyId);
  await deleteByCompanyId("employees", companyId);
  await deleteByCompanyId("lock_settings", companyId);

  const { error: deleteSalesError } = await admin.from("daily_sales").delete().eq("company_id", companyId);
  if (deleteSalesError) throw new Error(deleteSalesError.message);

  const userIds = [...new Set((linkedUsers ?? []).map((user) => user.user_id))];

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

    const remainingUserIds = new Set((remainingMappings ?? []).map((row) => row.user_id));
    const orphanedUserIds = userIds.filter((userId) => !remainingUserIds.has(userId));

    if (orphanedUserIds.length) {
      const { error: deleteRolesError } = await admin.from("user_roles").delete().in("user_id", orphanedUserIds);
      if (deleteRolesError) throw new Error(deleteRolesError.message);
    }
  }

  return "Company records removed successfully. Linked auth accounts were kept.";
}

async function updateCompany(payload: z.infer<typeof updateCompanySchema>) {
  const updates: Record<string, unknown> = {};
  if (payload.petrolPrice !== undefined) updates.petrol_price = payload.petrolPrice;
  if (payload.dieselPrice !== undefined) updates.diesel_price = payload.dieselPrice;
  if (payload.pumpCountPetrol !== undefined) updates.pump_count_petrol = payload.pumpCountPetrol;
  if (payload.pumpCountDiesel !== undefined) updates.pump_count_diesel = payload.pumpCountDiesel;
  if (payload.proprietorPassword !== undefined) updates.proprietor_password = payload.proprietorPassword;
  if (payload.supervisorPassword !== undefined) updates.supervisor_password = payload.supervisorPassword;
  if (payload.contactPhone !== undefined) updates.contact_phone = payload.contactPhone.trim() || null;
  if (payload.companyName !== undefined) updates.name = payload.companyName;

  if (Object.keys(updates).length === 0) {
    throw new Error("No fields to update");
  }

  const { error } = await admin
    .from("companies")
    .update(updates)
    .eq("id", payload.companyId);

  if (error) throw new Error(error.message);

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
    return json({ error: message }, 500);
  }
});