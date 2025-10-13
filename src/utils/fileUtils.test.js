import { describe, expect, it } from 'vitest'
import { createUniqueFileName, formatFileSize } from './fileUtils'

describe('fileUtils', () => {
  it('creates unique filenames while preserving extension', () => {
    const name1 = createUniqueFileName('resume.pdf')
    const name2 = createUniqueFileName('resume.pdf')

    expect(name1).not.toBe(name2)
    expect(name1.endsWith('.pdf')).toBe(true)
    expect(name2.endsWith('.pdf')).toBe(true)
  })

  it('sanitizes special characters in filenames', () => {
    const name = createUniqueFileName('My File (Final).PDF')
    expect(name).toMatch(/my-file-final-[\w-]+\.pdf$/i)
  })

  it('formats file sizes into human readable strings', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1048576)).toBe('1 MB')
  })
})
