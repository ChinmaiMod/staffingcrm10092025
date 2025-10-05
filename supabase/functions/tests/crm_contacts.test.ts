import { exists } from 'https://deno.land/std/fs/mod.ts'
import { assert } from 'https://deno.land/std/testing/asserts.ts'

Deno.test('crm_contacts function file exists', async () => {
  const path = './supabase/functions/crm_contacts/index.ts'
  const ok = await exists(path)
  assert(ok, `Expected function file at ${path}`)
})
