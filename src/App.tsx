/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { Header, Footer, PhaseBanner, CookieBanner } from './components/GDSComponents';
import Home from './components/Home';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import CategoryDetail from './components/CategoryDetail';
import ContentPage from './components/ContentPage';
import Accessibility from './components/Accessibility';
import Privacy from './components/Privacy';
import Terms from './components/Terms';
import News from './components/News';
import Petitions from './components/Petitions';
import PetitionDetail from './components/PetitionDetail';
import ProfileSettings from './components/ProfileSettings';

import Parliament from './components/Parliament';
import Feedback from './components/Feedback';
import ApplyCitizenship from './components/ApplyCitizenship';

function PrivateRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, role, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && (!role || role === 'user')) return <Navigate to="/" />;
  
  return <>{children}</>;
}

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col font-govuk">
      <CookieBanner />
      <Header />
      <main className="flex-grow">
        <PhaseBanner />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/browse/:categorySlug" element={<CategoryDetail />} />
          <Route path="/browse/:categorySlug/:pageSlug" element={<ContentPage />} />
          <Route path="/page/:pageSlug" element={<ContentPage />} />
          <Route path="/accessibility" element={<Accessibility />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/news" element={<News />} />
          <Route path="/petitions" element={<Petitions />} />
          <Route path="/petitions/:id" element={<PetitionDetail />} />
          <Route path="/parliament" element={<Parliament />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/contact" element={<Feedback />} />
          <Route path="/apply-citizenship" element={<ApplyCitizenship />} />
          <Route 
            path="/profile" 
            element={
              <PrivateRoute>
                <ProfileSettings />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin/*" 
            element={
              <PrivateRoute adminOnly>
                <AdminPanel />
              </PrivateRoute>
            } 
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
