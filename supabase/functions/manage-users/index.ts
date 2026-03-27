import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify caller is authenticated admin
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers })
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403, headers })
    }

    const body = await req.json()
    const { action } = body

    // LIST all users
    if (action === 'list') {
      const { data } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .order('criado_em')
      return new Response(JSON.stringify({ users: data || [] }), { headers })
    }

    // CREATE new user
    if (action === 'create') {
      const { nome, email, password, role } = body

      if (!nome || !email || !password) {
        return new Response(JSON.stringify({ error: 'Campos obrigatórios: nome, email, senha' }), { status: 400, headers })
      }

      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers })
      }

      // Create profile
      const { error: profileError } = await supabaseAdmin.from('user_profiles').insert({
        user_id: authData.user.id,
        nome,
        email,
        role: role || 'vendedor',
        senha_visivel: password,
      })

      if (profileError) {
        // Rollback: delete auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return new Response(JSON.stringify({ error: profileError.message }), { status: 400, headers })
      }

      return new Response(JSON.stringify({ success: true, user_id: authData.user.id }), { headers })
    }

    // UPDATE user
    if (action === 'update') {
      const { profile_id, nome, email, role, password, ativo } = body

      if (!profile_id) {
        return new Response(JSON.stringify({ error: 'profile_id obrigatório' }), { status: 400, headers })
      }

      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id, email')
        .eq('id', profile_id)
        .single()

      if (!profile) {
        return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), { status: 404, headers })
      }

      // Update auth user
      const authUpdate: Record<string, unknown> = {}
      if (email && email !== profile.email) authUpdate.email = email
      if (password) authUpdate.password = password
      if (typeof ativo === 'boolean') {
        authUpdate.ban_duration = ativo ? 'none' : '876000h'
      }

      if (Object.keys(authUpdate).length > 0) {
        const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
          profile.user_id,
          authUpdate
        )
        if (authErr) {
          return new Response(JSON.stringify({ error: authErr.message }), { status: 400, headers })
        }
      }

      // Update profile
      const profileUpdate: Record<string, unknown> = {}
      if (nome !== undefined) profileUpdate.nome = nome
      if (email !== undefined) profileUpdate.email = email
      if (role !== undefined) profileUpdate.role = role
      if (password) profileUpdate.senha_visivel = password
      if (typeof ativo === 'boolean') profileUpdate.ativo = ativo

      if (Object.keys(profileUpdate).length > 0) {
        await supabaseAdmin.from('user_profiles').update(profileUpdate).eq('id', profile_id)
      }

      return new Response(JSON.stringify({ success: true }), { headers })
    }

    return new Response(JSON.stringify({ error: 'Ação desconhecida' }), { status: 400, headers })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers })
  }
})
