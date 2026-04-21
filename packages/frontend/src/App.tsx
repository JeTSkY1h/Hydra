import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Layout from './components/Layout'
import OverviewPage from './pages/OverviewPage'
import InventarPage from './pages/InventarPage'
import BudgetPage from './pages/BudgetPage'
import KreditePage from './pages/KreditePage'
import VermoegenPage from './pages/VermoegenPage'
import EinstellungenPage from './pages/EinstellungenPage'
import KanbanPage from './pages/KanbanPage'
import { ThemeProvider } from './context/ThemeContext'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<OverviewPage />} />
              <Route path="inventar" element={<InventarPage />} />
              <Route path="budget" element={<BudgetPage />} />
              <Route path="kredite" element={<KreditePage />} />
              <Route path="vermoegen" element={<VermoegenPage />} />
              <Route path="einstellungen" element={<EinstellungenPage />} />
              <Route path="aufgaben" element={<KanbanPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </ThemeProvider>
      </DataProvider>
    </AuthProvider>
  )
}
