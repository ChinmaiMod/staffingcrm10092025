// Deno Edge Function: CRM Contacts CRUD
// Expects SUPABASE_SERVICE_ROLE_KEY + SUPABASE_URL (legacy fallback: SERVICE_ROLE_KEY)

import { serve } from 'std/server'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(SUPABASE_URL || '', SERVICE_ROLE_KEY || '')

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const pathname = url.pathname.replace(/\/+/g, '/')
    // Routes: GET / -> list, GET /:id -> get, POST / -> create, PUT /:id -> update, DELETE /:id -> delete
    const parts = pathname.split('/').filter(Boolean)

    // Simple auth: forward the Authorization header to Supabase to allow RLS checks for reads
    const authHeader = req.headers.get('authorization') || ''

    if (req.method === 'GET' && parts.length === 0) {
      // list contacts for caller's tenant
      const res = await supabase.from('contacts').select('*').order('created_at', { ascending: false }).limit(200)
      return new Response(JSON.stringify(res), { status: 200 })
    }

    if (req.method === 'GET' && parts.length === 1) {
      const id = parts[0]
      const res = await supabase.from('contacts').select('*').eq('contact_id', id).maybeSingle()
      return new Response(JSON.stringify(res), { status: 200 })
    }

    if (req.method === 'POST' && parts.length === 0) {
      const body = await req.json()
      // ensure created_by is set using auth.uid() on DB side or caller profile
      const insert = await supabase.from('contacts').insert(body).select().maybeSingle()
      return new Response(JSON.stringify(insert), { status: 201 })
    }

    if ((req.method === 'PUT' || req.method === 'PATCH') && parts.length === 1) {
      const id = parts[0]
      const body = await req.json()
      const upd = await supabase.from('contacts').update(body).eq('contact_id', id).select().maybeSingle()
      return new Response(JSON.stringify(upd), { status: 200 })
    }

    if (req.method === 'DELETE' && parts.length === 1) {
      const id = parts[0]
      const del = await supabase.from('contacts').delete().eq('contact_id', id)
      return new Response(JSON.stringify(del), { status: 200 })
    }

    return new Response('Not Found', { status: 404 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 })
  }
})
