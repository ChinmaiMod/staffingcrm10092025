export function toNullableNumberId(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed)
      return Number.isNaN(numeric) ? null : numeric
    }
    return null
  }

  if (typeof value === 'object') {
    // Common shapes from select/Autocomplete components
    if ('id' in value) {
      return toNullableNumberId(value.id)
    }
    if ('value' in value) {
      return toNullableNumberId(value.value)
    }
  }

  return null
}
