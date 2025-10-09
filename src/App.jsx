import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider'
import { TenantProvider } from './contexts/TenantProvider'

// Auth Components
import Login from './components/Auth/Login'
import Register from './components/Auth/Register'
import VerifyEmail from './components/Auth/VerifyEmail'
import ForgotPassword from './components/Auth/ForgotPassword'
import ResetPassword from './components/Auth/ResetPassword'

// Billing Components
import Plans from './components/Billing/Plans'
import PaymentSuccess from './components/Billing/PaymentSuccess'

// Dashboard Components
import TenantDashboard from './components/Dashboard/TenantDashboard'
import TenantAdmin from './components/Dashboard/TenantAdmin'
import SuperAdmin from './components/Dashboard/SuperAdmin'
import CRMApp from './components/CRM/CRMApp'

// Feedback Component
import Feedback from './components/Feedback/Feedback'

// Issue Report Component
import IssueReport from './components/IssueReport/IssueReport'

// Protected Route
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <TenantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant-admin"
            element={
              <ProtectedRoute>
                <TenantAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute>
                <SuperAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plans"
            element={
              <ProtectedRoute>
                <Plans />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment-success"
            element={
              <ProtectedRoute>
                <PaymentSuccess />
              </ProtectedRoute>
            }
          />

          {/* Module Routes (placeholders) */}
          <Route
            path="/crm/*"
            element={
              <ProtectedRoute>
                <CRMApp />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback"
            element={
              <ProtectedRoute>
                <Feedback />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report-issue"
            element={
              <ProtectedRoute>
                <IssueReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/suite"
            element={
              <ProtectedRoute>
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <h1>Complete Suite</h1>
                  <p>Access to CRM, HRMS, and Finance modules</p>
                </div>
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </TenantProvider>
    </AuthProvider>
  )
}

export default App
