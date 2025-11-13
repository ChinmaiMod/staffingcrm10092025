import { describe, it, expect } from 'vitest'
import { applyAdvancedFilters, describeFilter, isFilterEmpty } from './filterEngine.js'

describe('filterEngine.js', () => {
  describe('isFilterEmpty', () => {
    it('should return true for empty filter configs', () => {
      expect(isFilterEmpty(null)).toBe(true)
      expect(isFilterEmpty(undefined)).toBe(true)
      expect(isFilterEmpty({})).toBe(true)
      expect(isFilterEmpty({ groups: [] })).toBe(true)
    })

    it('should return true for groups with no conditions', () => {
      expect(isFilterEmpty({ groups: [{ conditions: [] }] })).toBe(true)
    })

    it('should return false for filters with conditions', () => {
      const filter = {
        groups: [{
          conditions: [
            { field: 'name', operator: 'contains', value: 'test' }
          ]
        }]
      }
      expect(isFilterEmpty(filter)).toBe(false)
    })
  })

  describe('applyAdvancedFilters', () => {
    const mockContacts = [
      { contact_id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com', status: 'active', job_title: 'Java Developer' },
      { contact_id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', status: 'inactive', job_title: 'JavaScript Engineer' },
      { contact_id: 3, first_name: 'Bob', last_name: 'Johnson', email: 'bob@test.com', status: 'active', job_title: 'Python Developer' },
      { contact_id: 4, first_name: 'Alice', last_name: 'Williams', email: null, status: 'pending', job_title: '' },
    ]

    it('should return all contacts when filter is empty', () => {
      const result = applyAdvancedFilters(mockContacts, null)
      expect(result).toEqual(mockContacts)
    })

    it('should filter by contains operator', () => {
      const filter = {
        groups: [{
          conditions: [
            { field: 'first_name', operator: 'contains', value: 'john' }
          ]
        }]
      }
      const result = applyAdvancedFilters(mockContacts, filter)
      expect(result).toHaveLength(1)
      expect(result.map(c => c.contact_id)).toEqual([1])
    })

    it('should filter by equals operator', () => {
      const filter = {
        groups: [{
          conditions: [
            { field: 'status', operator: 'equals', value: 'active' }
          ]
        }]
      }
      const result = applyAdvancedFilters(mockContacts, filter)
      expect(result).toHaveLength(2)
      expect(result.map(c => c.contact_id)).toEqual([1, 3])
    })

    it('should filter by not_equals operator', () => {
      const filter = {
        groups: [{
          conditions: [
            { field: 'status', operator: 'not_equals', value: 'active' }
          ]
        }]
      }
      const result = applyAdvancedFilters(mockContacts, filter)
      expect(result).toHaveLength(2)
      expect(result.map(c => c.contact_id)).toEqual([2, 4])
    })

    it('should filter by is_empty operator', () => {
      const filter = {
        groups: [{
          conditions: [
            { field: 'email', operator: 'is_empty', value: '' }
          ]
        }]
      }
      const result = applyAdvancedFilters(mockContacts, filter)
      expect(result).toHaveLength(1)
      expect(result[0].contact_id).toBe(4)
    })

    it('should filter by is_not_empty operator', () => {
      const filter = {
        groups: [{
          conditions: [
            { field: 'email', operator: 'is_not_empty', value: '' }
          ]
        }]
      }
      const result = applyAdvancedFilters(mockContacts, filter)
      expect(result).toHaveLength(3)
    })

    it('should filter by starts_with operator', () => {
      const filter = {
        groups: [{
          conditions: [
            { field: 'email', operator: 'starts_with', value: 'john' }
          ]
        }]
      }
      const result = applyAdvancedFilters(mockContacts, filter)
      expect(result).toHaveLength(1)
      expect(result[0].contact_id).toBe(1)
    })

    it('should filter by ends_with operator', () => {
      const filter = {
        groups: [{
          conditions: [
            { field: 'email', operator: 'ends_with', value: '.com' }
          ]
        }]
      }
      const result = applyAdvancedFilters(mockContacts, filter)
      expect(result).toHaveLength(3)
    })

    it('should handle AND logic within a group', () => {
      const filter = {
        groups: [{
          operator: 'and',
          conditions: [
            { field: 'status', operator: 'equals', value: 'active' },
            { field: 'first_name', operator: 'contains', value: 'john' }
          ]
        }]
      }
      const result = applyAdvancedFilters(mockContacts, filter)
      expect(result).toHaveLength(1)
      expect(result[0].contact_id).toBe(1)
    })

    it('should handle OR logic within a group', () => {
      const filter = {
        groups: [{
          operator: 'or',
          conditions: [
            { field: 'status', operator: 'equals', value: 'active' },
            { field: 'status', operator: 'equals', value: 'pending' }
          ]
        }]
      }
      const result = applyAdvancedFilters(mockContacts, filter)
      expect(result).toHaveLength(3)
      expect(result.map(c => c.contact_id).sort()).toEqual([1, 3, 4])
    })

    it('should handle case-insensitive filtering', () => {
      const filter = {
        groups: [{
          conditions: [
            { field: 'first_name', operator: 'contains', value: 'JOHN' }
          ]
        }]
      }
      const result = applyAdvancedFilters(mockContacts, filter)
      expect(result).toHaveLength(1)
      expect(result.map(c => c.contact_id)).toEqual([1])
    })

    it('should be case-insensitive for all text operators', () => {
      // Test equals operator
      let filter = {
        groups: [{
          conditions: [
            { field: 'status', operator: 'equals', value: 'ACTIVE' }
          ]
        }]
      }
      let result = applyAdvancedFilters(mockContacts, filter)
      expect(result).toHaveLength(2) // 'active' matches 'ACTIVE'

      // Test contains operator
      filter = {
        groups: [{
          conditions: [
            { field: 'email', operator: 'contains', value: 'EXAMPLE' }
          ]
        }]
      }
      result = applyAdvancedFilters(mockContacts, filter)
      expect(result).toHaveLength(2) // john@example.com, jane@example.com

      // Test starts_with operator
      filter = {
        groups: [{
          conditions: [
            { field: 'first_name', operator: 'starts_with', value: 'JO' }
          ]
        }]
      }
      result = applyAdvancedFilters(mockContacts, filter)
      expect(result).toHaveLength(1) // John

      // Test ends_with operator
      filter = {
        groups: [{
          conditions: [
            { field: 'email', operator: 'ends_with', value: '.COM' }
          ]
        }]
      }
      result = applyAdvancedFilters(mockContacts, filter)
      expect(result).toHaveLength(3) // All emails end with .com

      // Test not_equals operator
      filter = {
        groups: [{
          conditions: [
            { field: 'status', operator: 'not_equals', value: 'ACTIVE' }
          ]
        }]
      }
      result = applyAdvancedFilters(mockContacts, filter)
      expect(result).toHaveLength(2) // inactive, pending

      // Test not_contains operator
      filter = {
        groups: [{
          conditions: [
            { field: 'last_name', operator: 'not_contains', value: 'JOHN' }
          ]
        }]
      }
      result = applyAdvancedFilters(mockContacts, filter)
      expect(result).toHaveLength(3) // Doe, Smith, Williams (excludes Johnson)
    })

    it('should handle logicalOperator property from AdvancedFilterBuilder', () => {
      // AdvancedFilterBuilder sends 'logicalOperator' but filterEngine expects 'operator'
      const filter = {
        groups: [{
          logicalOperator: 'AND',  // This is what AdvancedFilterBuilder sends
          conditions: [
            { field: 'status', operator: 'equals', value: 'active' },
            { field: 'first_name', operator: 'contains', value: 'john' }
          ]
        }]
      }
      const result = applyAdvancedFilters(mockContacts, filter)
      expect(result).toHaveLength(1)
      expect(result[0].contact_id).toBe(1)
    })

    it('should handle multiple conditions with AND using logicalOperator', () => {
      const filter = {
        groups: [{
          logicalOperator: 'AND',
          conditions: [
            { field: 'status', operator: 'equals', value: 'active' },
            { field: 'last_name', operator: 'contains', value: 'john' }
          ]
        }]
      }
      const result = applyAdvancedFilters(mockContacts, filter)
      expect(result).toHaveLength(1)
      expect(result[0].contact_id).toBe(3) // Bob Johnson
    })

    it('should handle multiple conditions with OR using logicalOperator', () => {
      const filter = {
        groups: [{
          logicalOperator: 'OR',
          conditions: [
            { field: 'first_name', operator: 'equals', value: 'John' },
            { field: 'first_name', operator: 'equals', value: 'Jane' }
          ]
        }]
      }
      const result = applyAdvancedFilters(mockContacts, filter)
      expect(result).toHaveLength(2)
      expect(result.map(c => c.contact_id).sort()).toEqual([1, 2])
    })

    describe('job_title field - ALL operators', () => {
      it('should filter job_title with CONTAINS operator for "java"', () => {
        const filter = {
          groups: [{
            logicalOperator: 'AND',
            conditions: [
              { field: 'job_title', operator: 'contains', value: 'java' }
            ]
          }]
        }
        const result = applyAdvancedFilters(mockContacts, filter)
        console.log('CONTAINS "java" results:', result.map(c => ({ id: c.contact_id, job_title: c.job_title })))
        expect(result).toHaveLength(2) // Should match "Java Developer" and "JavaScript Engineer"
        expect(result.map(c => c.contact_id).sort()).toEqual([1, 2])
      })

      it('should filter job_title with CONTAINS operator for "Java" (exact case)', () => {
        const filter = {
          groups: [{
            logicalOperator: 'AND',
            conditions: [
              { field: 'job_title', operator: 'contains', value: 'Java' }
            ]
          }]
        }
        const result = applyAdvancedFilters(mockContacts, filter)
        console.log('CONTAINS "Java" results:', result.map(c => ({ id: c.contact_id, job_title: c.job_title })))
        expect(result).toHaveLength(2) // Should be case-insensitive
        expect(result.map(c => c.contact_id).sort()).toEqual([1, 2])
      })

      it('should filter job_title with EQUALS operator', () => {
        const filter = {
          groups: [{
            logicalOperator: 'AND',
            conditions: [
              { field: 'job_title', operator: 'equals', value: 'Java Developer' }
            ]
          }]
        }
        const result = applyAdvancedFilters(mockContacts, filter)
        console.log('EQUALS "Java Developer" results:', result.map(c => ({ id: c.contact_id, job_title: c.job_title })))
        expect(result).toHaveLength(1)
        expect(result[0].contact_id).toBe(1)
      })

      it('should filter job_title with NOT_EQUALS operator', () => {
        const filter = {
          groups: [{
            logicalOperator: 'AND',
            conditions: [
              { field: 'job_title', operator: 'not_equals', value: 'Java Developer' }
            ]
          }]
        }
        const result = applyAdvancedFilters(mockContacts, filter)
        console.log('NOT_EQUALS "Java Developer" results:', result.map(c => ({ id: c.contact_id, job_title: c.job_title })))
        expect(result).toHaveLength(2) // JavaScript Engineer and Python Developer (empty is excluded)
        expect(result.map(c => c.contact_id).sort()).toEqual([2, 3])
      })

      it('should filter job_title with STARTS_WITH operator', () => {
        const filter = {
          groups: [{
            logicalOperator: 'AND',
            conditions: [
              { field: 'job_title', operator: 'starts_with', value: 'Java' }
            ]
          }]
        }
        const result = applyAdvancedFilters(mockContacts, filter)
        console.log('STARTS_WITH "Java" results:', result.map(c => ({ id: c.contact_id, job_title: c.job_title })))
        expect(result).toHaveLength(2) // Java Developer and JavaScript Engineer
        expect(result.map(c => c.contact_id).sort()).toEqual([1, 2])
      })

      it('should filter job_title with ENDS_WITH operator', () => {
        const filter = {
          groups: [{
            logicalOperator: 'AND',
            conditions: [
              { field: 'job_title', operator: 'ends_with', value: 'Developer' }
            ]
          }]
        }
        const result = applyAdvancedFilters(mockContacts, filter)
        console.log('ENDS_WITH "Developer" results:', result.map(c => ({ id: c.contact_id, job_title: c.job_title })))
        expect(result).toHaveLength(2) // Java Developer and Python Developer
        expect(result.map(c => c.contact_id).sort()).toEqual([1, 3])
      })

      it('should filter job_title with NOT_CONTAINS operator', () => {
        const filter = {
          groups: [{
            logicalOperator: 'AND',
            conditions: [
              { field: 'job_title', operator: 'not_contains', value: 'Python' }
            ]
          }]
        }
        const result = applyAdvancedFilters(mockContacts, filter)
        console.log('NOT_CONTAINS "Python" results:', result.map(c => ({ id: c.contact_id, job_title: c.job_title })))
        expect(result).toHaveLength(2) // Java Developer and JavaScript Engineer (empty is excluded)
        expect(result.map(c => c.contact_id).sort()).toEqual([1, 2])
      })

      it('should filter job_title with IS_EMPTY operator', () => {
        const filter = {
          groups: [{
            logicalOperator: 'AND',
            conditions: [
              { field: 'job_title', operator: 'is_empty', value: '' }
            ]
          }]
        }
        const result = applyAdvancedFilters(mockContacts, filter)
        console.log('IS_EMPTY results:', result.map(c => ({ id: c.contact_id, job_title: c.job_title })))
        expect(result).toHaveLength(1) // Alice with empty job_title
        expect(result[0].contact_id).toBe(4)
      })

      it('should filter job_title with IS_NOT_EMPTY operator', () => {
        const filter = {
          groups: [{
            logicalOperator: 'AND',
            conditions: [
              { field: 'job_title', operator: 'is_not_empty', value: '' }
            ]
          }]
        }
        const result = applyAdvancedFilters(mockContacts, filter)
        console.log('IS_NOT_EMPTY results:', result.map(c => ({ id: c.contact_id, job_title: c.job_title })))
        expect(result).toHaveLength(3) // All except Alice
        expect(result.map(c => c.contact_id).sort()).toEqual([1, 2, 3])
      })
    })
  })

  describe('describeFilter', () => {
    it('should return default message for empty filter', () => {
      expect(describeFilter(null)).toBe('No filters applied')
      expect(describeFilter({ groups: [] })).toBe('No filters applied')
    })

    it('should describe a simple filter', () => {
      const filter = {
        groups: [{
          conditions: [
            { field: 'first_name', operator: 'contains', value: 'john' }
          ]
        }]
      }
      const description = describeFilter(filter)
      expect(description).toContain('First Name')
      expect(description).toContain('contains')
      expect(description).toContain('john')
    })

    it('should describe is_empty condition', () => {
      const filter = {
        groups: [{
          conditions: [
            { field: 'email', operator: 'is_empty', value: '' }
          ]
        }]
      }
      const description = describeFilter(filter)
      expect(description).toContain('Email is empty')
    })

    it('should describe is_not_empty condition', () => {
      const filter = {
        groups: [{
          conditions: [
            { field: 'email', operator: 'is_not_empty', value: '' }
          ]
        }]
      }
      const description = describeFilter(filter)
      expect(description).toContain('Email is not empty')
    })

    it('should handle multiple conditions with AND', () => {
      const filter = {
        groupOperator: 'and',
        groups: [{
          operator: 'and',
          conditions: [
            { field: 'status', operator: 'equals', value: 'active' },
            { field: 'first_name', operator: 'contains', value: 'john' }
          ]
        }]
      }
      const description = describeFilter(filter)
      expect(description).toContain('and')
    })

    it('should convert field names to readable labels', () => {
      const filter = {
        groups: [{
          conditions: [
            { field: 'first_name', operator: 'contains', value: 'test' }
          ]
        }]
      }
      const description = describeFilter(filter)
      expect(description).toContain('First Name')
      expect(description).not.toContain('first_name')
    })
  })
})
