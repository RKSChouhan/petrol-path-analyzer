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

    // Get passwords from environment variables (stored securely in Supabase vault)
    const validPasswords: Record<string, string | undefined> = {
      'Supervisor': Deno.env.get('SUPERVISOR_PASSWORD_HASH'),
      'Proprietor': Deno.env.get('PROPRIETOR_PASSWORD_HASH')
    }

    const storedPassword = validPasswords[role]
    
    if (!storedPassword) {
      console.log('No password configured for role:', role)
      return new Response(
        JSON.stringify({ success: false, error: 'Role not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Validating password for role:', role)

    // Compare the provided password directly with the stored secret
    if (password !== storedPassword) {
      console.log('Password mismatch for role:', role)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role client to bypass RLS and assign role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Assign role using service role (bypasses RLS)
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

    console.log('Role assigned successfully:', role, 'for user:', user.id)

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
