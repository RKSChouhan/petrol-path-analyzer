import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('No authorization header provided')
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client with user's token for auth verification
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      console.log('Auth error:', authError?.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { role, password } = await req.json()

    if (!role || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Role and password required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate role
    if (role !== 'Supervisor' && role !== 'Proprietor') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Step 1: Look up the user's company from user_companies
    const { data: userCompany, error: companyLookupError } = await supabaseAdmin
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (companyLookupError || !userCompany) {
      console.log('No company found for user:', user.id, companyLookupError?.message)
      return new Response(
        JSON.stringify({ success: false, error: 'No company associated with this account. Please contact the owner.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found company for user:', userCompany.company_id)

    // Step 2: Fetch the company's role passwords
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('supervisor_password, proprietor_password')
      .eq('id', userCompany.company_id)
      .single()

    if (companyError || !company) {
      console.error('Error fetching company passwords:', companyError?.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Company configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 3: Validate the password against the company's stored password
    const storedPassword = role === 'Supervisor' 
      ? company.supervisor_password 
      : company.proprietor_password

    console.log('Validating password for role:', role, 'company:', userCompany.company_id)

    if (password !== storedPassword) {
      console.log('Password mismatch for role:', role)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 4: Assign role using service role (bypasses RLS)
    const { error: insertError } = await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: user.id, role: role }, { onConflict: 'user_id,role' })

    if (insertError) {
      console.error('Role assignment error:', insertError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to assign role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Role assigned successfully:', role, 'for user:', user.id, 'company:', userCompany.company_id)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
