import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('user_id', caller.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Sem permissão' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const { email, password, nome, role, telefone, permissions } = body;

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const effectiveRole = role || 'vendedor';
      const isAdminRole = effectiveRole === 'admin';

      await supabaseAdmin.from('user_profiles').insert({
        user_id: data.user.id,
        nome,
        email,
        role: effectiveRole,
        telefone: telefone || null,
        acesso_painel_gestor: permissions?.gestor_obras || permissions?.gestor_clientes || permissions?.gestor_materiais || permissions?.gestor_equipamentos || permissions?.gestor_custos || isAdminRole || false,
      });

      // Create permissions
      if (permissions && !isAdminRole) {
        await supabaseAdmin.from('user_permissions').insert({
          user_id: data.user.id,
          ...permissions,
        });
      } else {
        // Admin gets all permissions
        await supabaseAdmin.from('user_permissions').insert({
          user_id: data.user.id,
          calculadora: true, gestor_obras: true, gestor_clientes: true,
          gestor_materiais: true, gestor_equipamentos: true, gestor_custos: true,
          estoque: true, admin: true, importar_dados: true, sincronizar_sheets: true, zerar_base: true,
          posvenda: permissions?.posvenda ?? false,
        });
      }

      return new Response(JSON.stringify({ user: data.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update') {
      const { user_id, nome, role, ativo, password, email, permissions } = body;

      const updates: Record<string, any> = {};
      if (nome !== undefined) updates.nome = nome;
      if (role !== undefined) updates.role = role;
      if (ativo !== undefined) updates.ativo = ativo;
      if (email !== undefined) updates.email = email;
      if (body.telefone !== undefined) updates.telefone = body.telefone;

      // Update acesso_painel_gestor based on permissions
      if (permissions) {
        updates.acesso_painel_gestor = permissions.gestor_obras || permissions.gestor_clientes || permissions.gestor_materiais || permissions.gestor_equipamentos || permissions.gestor_custos || permissions.admin || false;
      } else if (body.acesso_painel_gestor !== undefined) {
        updates.acesso_painel_gestor = body.acesso_painel_gestor;
      }

      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from('user_profiles').update(updates).eq('user_id', user_id);
      }

      // Update permissions
      if (permissions) {
        const isAdminRole = role === 'admin' || permissions.admin;
        const permData = isAdminRole ? {
          calculadora: true, gestor_obras: true, gestor_clientes: true,
          gestor_materiais: true, gestor_equipamentos: true, gestor_custos: true,
          estoque: true, admin: true, importar_dados: true, sincronizar_sheets: true, zerar_base: true,
          posvenda: permissions?.posvenda ?? false,
        } : permissions;

        const { data: existingPerm } = await supabaseAdmin.from('user_permissions').select('id').eq('user_id', user_id).maybeSingle();
        if (existingPerm) {
          await supabaseAdmin.from('user_permissions').update(permData).eq('user_id', user_id);
        } else {
          await supabaseAdmin.from('user_permissions').insert({ user_id, ...permData });
        }
      }

      // Update auth user if password or email changed
      const authUpdates: Record<string, any> = {};
      if (password) authUpdates.password = password;
      if (email) authUpdates.email = email;
      if (Object.keys(authUpdates).length > 0) {
        await supabaseAdmin.auth.admin.updateUserById(user_id, authUpdates);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete') {
      const { user_id } = body;
      await supabaseAdmin.from('user_permissions').delete().eq('user_id', user_id);
      await supabaseAdmin.from('user_profiles').delete().eq('user_id', user_id);
      await supabaseAdmin.auth.admin.deleteUser(user_id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list') {
      const { data: users } = await supabaseAdmin.from('user_profiles').select('*').order('criado_em');
      const { data: allPerms } = await supabaseAdmin.from('user_permissions').select('*');
      const permsMap: Record<string, any> = {};
      (allPerms || []).forEach((p: any) => { permsMap[p.user_id] = p; });
      const enriched = (users || []).map((u: any) => ({ ...u, permissions: permsMap[u.user_id] || null }));
      return new Response(JSON.stringify({ users: enriched }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ação desconhecida' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
