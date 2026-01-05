import { describe, expect, it } from 'vitest'
import { toNullableNumberId } from './idCoercion'

describe('toNullableNumberId', () => {
  it('returns null for nullish/empty inputs', () => {
    expect(toNullableNumberId(null)).toBeNull()
    expect(toNullableNumberId(undefined)).toBeNull()
    expect(toNullableNumberId('')).toBeNull()
    expect(toNullableNumberId('   ')).toBeNull()
  })

  it('returns number for numeric values/strings', () => {
    expect(toNullableNumberId(1)).toBe(1)
    expect(toNullableNumberId('1')).toBe(1)
    expect(toNullableNumberId('  42 ')).toBe(42)
  })

  it('returns null for non-numeric strings', () => {
    expect(toNullableNumberId('abc')).toBeNull()
    expect(toNullableNumberId('fallback-status-0')).toBeNull()
    expect(toNullableNumberId('1abc')).toBeNull()
  })

  it('handles object shapes', () => {
    expect(toNullableNumberId({ id: 7 })).toBe(7)
    expect(toNullableNumberId({ id: '8' })).toBe(8)
    expect(toNullableNumberId({ value: '9' })).toBe(9)
    expect(toNullableNumberId({ id: 'fallback-status-0' })).toBeNull()
  })
})
