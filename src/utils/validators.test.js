import { describe, it, expect } from 'vitest'
import {
  validateEmail,
  validatePhone,
  validateTextField,
  validateSelect,
  validatePassword,
  handleSupabaseError,
} from './validators.js'

describe('validators.js', () => {
  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(validateEmail('test@example.com')).toEqual({ valid: true, error: null })
      expect(validateEmail('user.name+tag@domain.co.uk')).toEqual({ valid: true, error: null })
      expect(validateEmail('user_123@test-domain.com')).toEqual({ valid: true, error: null })
    })

    it('should reject invalid email addresses', () => {
      expect(validateEmail('')).toEqual({ valid: false, error: 'Email address is required' })
      expect(validateEmail('invalid')).toEqual({ valid: false, error: 'Please enter a valid email address (e.g., user@example.com)' })
      expect(validateEmail('test@')).toEqual({ valid: false, error: 'Please enter a valid email address (e.g., user@example.com)' })
      expect(validateEmail('@domain.com')).toEqual({ valid: false, error: 'Please enter a valid email address (e.g., user@example.com)' })
      expect(validateEmail('test @domain.com')).toEqual({ valid: false, error: 'Please enter a valid email address (e.g., user@example.com)' })
    })

    it('should handle whitespace correctly', () => {
      expect(validateEmail('  ')).toEqual({ valid: false, error: 'Please enter a valid email address (e.g., user@example.com)' })
      expect(validateEmail('test@example.com  ')).toEqual({ valid: true, error: null })
    })
  })

  describe('validatePhone', () => {
    it('should accept valid phone numbers', () => {
      expect(validatePhone('1234567890')).toEqual({ valid: true, error: null })
      expect(validatePhone('+11234567890')).toEqual({ valid: true, error: null })
      expect(validatePhone('123-456-7890')).toEqual({ valid: true, error: null })
      expect(validatePhone('(123) 456-7890')).toEqual({ valid: true, error: null })
      expect(validatePhone('+1 (123) 456-7890')).toEqual({ valid: true, error: null })
    })

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('123')).toEqual({ valid: false, error: 'Please enter a valid phone number (10-15 digits)' })
      expect(validatePhone('12345678901234567890')).toEqual({ valid: false, error: 'Please enter a valid phone number (10-15 digits)' })
      expect(validatePhone('abcdefghij')).toEqual({ valid: false, error: 'Please enter a valid phone number (10-15 digits)' })
    })

    it('should accept empty phone when not required', () => {
      expect(validatePhone('')).toEqual({ valid: true, error: null })
      expect(validatePhone('', false)).toEqual({ valid: true, error: null })
    })

    it('should reject empty phone when required', () => {
      expect(validatePhone('', true)).toEqual({ valid: false, error: 'Phone number is required' })
    })
  })

  describe('validateTextField', () => {
    it('should accept valid text fields', () => {
      expect(validateTextField('John Doe', 'Name')).toEqual({ valid: true, error: null })
      expect(validateTextField('A', 'Name', { minLength: 1, maxLength: 100 })).toEqual({ valid: true, error: null })
    })

    it('should reject empty required fields', () => {
      expect(validateTextField('', 'Name', { required: true })).toEqual({ valid: false, error: 'Name is required' })
      expect(validateTextField('  ', 'Name', { required: true })).toEqual({ valid: false, error: 'Name is required' })
    })

    it('should accept empty non-required fields', () => {
      expect(validateTextField('', 'Name', { required: false })).toEqual({ valid: true, error: null })
    })

    it('should enforce minimum length', () => {
      expect(validateTextField('AB', 'Name', { minLength: 3, maxLength: 100 })).toEqual({ valid: false, error: 'Name must be at least 3 characters long' })
      expect(validateTextField('ABC', 'Name', { minLength: 3, maxLength: 100 })).toEqual({ valid: true, error: null })
    })

    it('should enforce maximum length', () => {
      expect(validateTextField('A'.repeat(101), 'Name', { minLength: 1, maxLength: 100 })).toEqual({ valid: false, error: 'Name is too long (maximum 100 characters)' })
      expect(validateTextField('A'.repeat(100), 'Name', { minLength: 1, maxLength: 100 })).toEqual({ valid: true, error: null })
    })
  })

  describe('validateSelect', () => {
    it('should accept valid selections', () => {
      expect(validateSelect('option1', 'Field')).toEqual({ valid: true, error: null })
      expect(validateSelect('any-value', 'Field')).toEqual({ valid: true, error: null })
    })

    it('should reject empty required selections', () => {
      expect(validateSelect('', 'Field', true)).toEqual({ valid: false, error: 'Please select a field' })
      expect(validateSelect(null, 'Field', true)).toEqual({ valid: false, error: 'Please select a field' })
      expect(validateSelect(undefined, 'Field', true)).toEqual({ valid: false, error: 'Please select a field' })
    })

    it('should accept empty non-required selections', () => {
      expect(validateSelect('', 'Field', false)).toEqual({ valid: true, error: null })
      expect(validateSelect(null, 'Field', false)).toEqual({ valid: true, error: null })
    })
  })

  describe('validatePassword', () => {
    it('should accept strong passwords', () => {
      expect(validatePassword('Password123!', { requireUppercase: true, requireLowercase: true, requireNumbers: true, requireSpecialChars: true })).toEqual({ valid: true, error: null })
      expect(validatePassword('MyP@ssw0rd', { requireUppercase: true, requireLowercase: true, requireNumbers: true, requireSpecialChars: true })).toEqual({ valid: true, error: null })
      expect(validatePassword('Str0ng!Pass', { requireUppercase: true, requireLowercase: true, requireNumbers: true, requireSpecialChars: true })).toEqual({ valid: true, error: null })
    })

    it('should reject short passwords', () => {
      expect(validatePassword('Pass1!')).toEqual({ valid: false, error: 'Password must be at least 8 characters long' })
    })

    it('should reject passwords without uppercase letters', () => {
      expect(validatePassword('password123!', { requireUppercase: true })).toEqual({ valid: false, error: 'Password must contain at least one uppercase letter' })
    })

    it('should reject passwords without lowercase letters', () => {
      expect(validatePassword('PASSWORD123!', { requireLowercase: true })).toEqual({ valid: false, error: 'Password must contain at least one lowercase letter' })
    })

    it('should reject passwords without numbers', () => {
      expect(validatePassword('Password!', { requireNumbers: true })).toEqual({ valid: false, error: 'Password must contain at least one number' })
    })

    it('should reject passwords without special characters', () => {
      expect(validatePassword('Password123', { requireSpecialChars: true })).toEqual({ valid: false, error: 'Password must contain at least one special character' })
    })

    it('should reject empty passwords', () => {
      expect(validatePassword('')).toEqual({ valid: false, error: 'Password is required' })
    })
  })

  describe('handleSupabaseError', () => {
    it('should return user-friendly messages for common errors', () => {
      expect(handleSupabaseError({ message: 'Invalid login credentials' })).toBe('Invalid login credentials')
      expect(handleSupabaseError({ message: 'User already registered' })).toBe('User already registered')
      expect(handleSupabaseError({ message: 'Email not confirmed' })).toBe('Email not confirmed')
    })

    it('should return original message for unknown errors', () => {
      expect(handleSupabaseError({ message: 'Some random error' })).toBe('Some random error')
      expect(handleSupabaseError({ message: 'Network timeout' })).toBe('Network timeout')
    })

    it('should handle errors without message property', () => {
      expect(handleSupabaseError({})).toBe('An error occurred while processing your request. Please try again.')
      expect(handleSupabaseError(null)).toBe('An error occurred while processing your request. Please try again.')
    })

    it('should handle string errors', () => {
      expect(handleSupabaseError('Error string')).toBe('An error occurred while processing your request. Please try again.')
    })
  })
})
