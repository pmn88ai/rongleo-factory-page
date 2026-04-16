// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandPage        from './pages/LandPage'
import AdminPage       from './pages/AdminPage'
import Dashboard       from './pages/Dashboard'
import ConfigPage      from './pages/ConfigPage'
import ThemeEditor     from './pages/ThemeEditor'
import AnalyticsPage   from './pages/AnalyticsPage'
import ProtectedRoute  from './components/ProtectedRoute'
import { initGA }      from './lib/analytics'
import './index.css'

// Init GA4 ngay khi app start — idempotent, safe nếu ID chưa có
initGA(import.meta.env.VITE_GA_ID)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/land/:slug" element={<LandPage />} />

        {/* Protected — password required */}
        <Route path="/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin"        element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/theme-editor" element={<ProtectedRoute><ThemeEditor /></ProtectedRoute>} />
        <Route path="/config"       element={<ProtectedRoute><ConfigPage /></ProtectedRoute>} />
        <Route path="/analytics"    element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />

        {/* Default → dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
