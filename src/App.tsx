import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { DemoPage } from '@/pages/DemoPage'
import { ProjectPage } from '@/pages/ProjectPage'
import { TrackPage } from '@/pages/TrackPage'
import { Spinner } from '@/components/ui/Spinner'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center"><Spinner /></div>
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            element={
              <AuthGuard>
                <AppShell />
              </AuthGuard>
            }
          >
            <Route
              path="/"
              element={
                <motion.div key="dashboard" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="h-full">
                  <DashboardPage />
                </motion.div>
              }
            />
            <Route
              path="/demo"
              element={
                <motion.div key="demo" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="h-full">
                  <DemoPage />
                </motion.div>
              }
            />
            <Route
              path="/project/:id"
              element={
                <motion.div key="project" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="h-full">
                  <ProjectPage />
                </motion.div>
              }
            />
            <Route
              path="/project/:id/track/:trackId"
              element={
                <motion.div key="track" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="h-full">
                  <TrackPage />
                </motion.div>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  )
}
