import { vi } from 'vitest'

// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(),
      })),
      order: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
    })),
  },
}

// Mock Auth Context
export const mockAuthContext = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
  },
  profile: {
    id: 'test-profile-id',
    email: 'test@example.com',
    username: 'testuser',
    role: 'admin',
    tenant_id: 'test-tenant-id',
  },
  session: {
    access_token: 'test-token',
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
  },
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
}

// Mock Tenant Context
export const mockTenantContext = {
  tenant: {
    tenant_id: 'test-tenant-id',
    company_name: 'Test Company',
    status: 'active',
  },
  subscription: {
    subscription_id: 'test-sub-id',
    status: 'active',
    plan: 'premium',
  },
  loading: false,
  refreshTenantData: vi.fn(),
  getPlanName: vi.fn(() => 'Premium'),
}

// Reset all mocks
export const resetAllMocks = () => {
  vi.clearAllMocks()
}
