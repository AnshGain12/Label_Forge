import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthPage from './components/Auth/AuthPage';
import Dashboard from './components/Dashboard/Dashboard';
import ProjectPage from './components/Project/ProjectPage';
import AnnotationPage from './components/Annotation/AnnotationPage';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex-center" style={{ height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spin" style={{ width: 40, height: 40, border: '3px solid #2a2a3a', borderTop: '3px solid #6c63ff', borderRadius: '50%', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text2)' }}>Loading...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/auth" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/project/:id" element={<PrivateRoute><ProjectPage /></PrivateRoute>} />
        <Route path="/project/:projectId/annotate/:imageId" element={<PrivateRoute><AnnotationPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
