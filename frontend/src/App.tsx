import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider } from './components/ToastContainer'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Consultations from './pages/Consultations'
import ConsultationDetail from './pages/ConsultationDetail'

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={<Layout />}>
              <Route index element={<Dashboard />} />
            </Route>
            <Route path="/upload" element={<Layout />}>
              <Route index element={<Upload />} />
            </Route>
            <Route path="/consultations" element={<Layout />}>
              <Route index element={<Consultations />} />
              <Route path=":id" element={<ConsultationDetail />} />
            </Route>
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
