# Testing Quick Reference Guide

## 🚀 Quick Start

```powershell
# Run all tests in watch mode
npm test

# Run tests once (for CI/CD)
npm run test:run

# Run tests with UI dashboard
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## 📝 Writing Your First Test

### Unit Test Example

```javascript
import { describe, it, expect } from 'vitest'
import { myFunction } from './myFile.js'

describe('myFunction', () => {
  it('should return expected value', () => {
    const result = myFunction('input')
    expect(result).toBe('expected output')
  })
})
```

### Component Test Example

```javascript
import { describe, it, expect } from 'vitest'
import { render, screen } from '../test/utils.jsx'
import MyComponent from './MyComponent.jsx'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })
})
```

## 🎯 Common Test Patterns

### Testing User Interactions

```javascript
import userEvent from '@testing-library/user-event'

it('should handle button click', async () => {
  const user = userEvent.setup()
  render(<MyComponent />)
  
  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  expect(screen.getByText('Success!')).toBeInTheDocument()
})
```

### Testing Forms

```javascript
it('should submit form with valid data', async () => {
  const user = userEvent.setup()
  const handleSubmit = vi.fn()
  
  render(<MyForm onSubmit={handleSubmit} />)
  
  await user.type(screen.getByLabelText(/email/i), 'test@example.com')
  await user.type(screen.getByLabelText(/password/i), 'Password123!')
  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  expect(handleSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      email: 'test@example.com',
      password: 'Password123!'
    })
  )
})
```

### Testing Async Operations

```javascript
import { waitFor } from '@testing-library/react'

it('should load data asynchronously', async () => {
  render(<MyComponent />)
  
  await waitFor(() => {
    expect(screen.getByText('Loaded Data')).toBeInTheDocument()
  })
})
```

### Mocking Functions

```javascript
import { vi } from 'vitest'

it('should call mock function', () => {
  const mockFn = vi.fn()
  render(<MyComponent onClick={mockFn} />)
  
  screen.getByRole('button').click()
  
  expect(mockFn).toHaveBeenCalled()
  expect(mockFn).toHaveBeenCalledTimes(1)
})
```

## 🔍 Finding Elements

### By Role (Preferred)
```javascript
screen.getByRole('button', { name: /submit/i })
screen.getByRole('textbox', { name: /email/i })
screen.getByRole('heading', { name: /welcome/i })
```

### By Label Text
```javascript
screen.getByLabelText(/email address/i)
screen.getByLabelText(/password/i)
```

### By Text
```javascript
screen.getByText(/hello world/i)
screen.getByText('Exact text match')
```

### By Test ID (Last Resort)
```javascript
screen.getByTestId('custom-element')
```

## ✅ Common Assertions

```javascript
// Existence
expect(element).toBeInTheDocument()
expect(element).not.toBeInTheDocument()

// Visibility
expect(element).toBeVisible()
expect(element).not.toBeVisible()

// Content
expect(element).toHaveTextContent('text')
expect(element).toHaveValue('value')

// Attributes
expect(element).toHaveAttribute('disabled')
expect(element).toHaveClass('active')

// State
expect(button).toBeDisabled()
expect(checkbox).toBeChecked()

// Function calls
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledWith('arg')
expect(mockFn).toHaveBeenCalledTimes(2)
```

## 🛠️ Test Utilities

### Using Custom Render with Providers

```javascript
import { render } from '../test/utils.jsx'

it('should render with auth context', () => {
  render(<MyComponent />, {
    authValue: {
      user: { id: '123', email: 'test@example.com' },
      loading: false,
    }
  })
})
```

### Clearing Mocks

```javascript
import { beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.clearAllMocks()
})
```

### Mocking Modules

```javascript
vi.mock('../api/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null }))
    }))
  }
}))
```

## 🎨 Test Structure

```javascript
describe('Component/Function Name', () => {
  // Setup
  beforeEach(() => {
    // Runs before each test
  })
  
  afterEach(() => {
    // Runs after each test
  })
  
  // Group related tests
  describe('specific functionality', () => {
    it('should do something', () => {
      // Arrange - Setup test data
      const input = 'test'
      
      // Act - Execute the code
      const result = myFunction(input)
      
      // Assert - Verify the result
      expect(result).toBe('expected')
    })
  })
})
```

## 🐛 Debugging Tests

### Run Specific Test
```powershell
npm test -- src/utils/validators.test.js
```

### Run Tests Matching Pattern
```powershell
npm test -- --grep "validateEmail"
```

### Print Component HTML
```javascript
import { screen } from '@testing-library/react'

screen.debug() // Prints entire document
screen.debug(screen.getByRole('button')) // Prints specific element
```

### Use Vitest UI
```powershell
npm run test:ui
```

## ⚡ Performance Tips

1. **Use `screen` queries** instead of destructuring render result
2. **Avoid `waitFor` when not needed** - Use it only for async operations
3. **Clean up after tests** - Use `cleanup()` in afterEach
4. **Mock heavy dependencies** - Don't test external libraries
5. **Keep tests focused** - One assertion per test when possible

## 📚 File Naming Convention

```
ComponentName.jsx       → ComponentName.test.jsx
utilityFunction.js      → utilityFunction.test.js
customHook.js          → customHook.test.js
```

## 🎯 Coverage Commands

```powershell
# Generate coverage report
npm run test:coverage

# View coverage in browser
# Open coverage/index.html after running coverage

# Check coverage thresholds
npm run test:coverage -- --coverage.threshold.lines=80
```

## 🔗 Useful Resources

- [Vitest Docs](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [React Testing Library Cheatsheet](https://testing-library.com/docs/react-testing-library/cheatsheet/)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 💡 Best Practices

1. ✅ Test user behavior, not implementation
2. ✅ Use accessible queries (getByRole, getByLabelText)
3. ✅ Write descriptive test names
4. ✅ Keep tests simple and focused
5. ✅ Avoid testing third-party libraries
6. ✅ Mock external dependencies
7. ✅ Test edge cases and error states
8. ✅ Use `waitFor` for async operations
9. ✅ Clean up mocks between tests
10. ✅ Maintain test coverage above 80%

---

**Quick Help:**
- Run `npm test -- --help` for CLI options
- Check `vitest.config.js` for configuration
- See `src/test/setup.js` for global test setup
- Use `src/test/utils.jsx` for test helpers
