import { assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts'

Deno.test('updateTenantStatus function file exists', () => {
  const exists = Deno.statSync(new URL('../updateTenantStatus/index.ts', import.meta.url)).isFile
  assert(exists)
})
