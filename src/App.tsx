import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Views
import Home from './views/Home';
import Login from './views/Login';
import Signup from './views/Signup';
import Report from './views/Report';
import Issues from './views/Issues';
import IssueDetail from './views/IssueDetail';
import Dashboard from './views/Dashboard';
import Profile from './views/Profile';
import Admin from './views/Admin';
import Leaderboard from './views/Leaderboard';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public authentication paths */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Core App Layout Paths */}
          <Route 
            path="/" 
            element={
              <Layout>
                <Home />
              </Layout>
            } 
          />
          <Route 
            path="/report" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Report />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/issues" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Issues />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/issues/:issueId" 
            element={
              <ProtectedRoute>
                <Layout>
                  <IssueDetail />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/leaderboard" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Leaderboard />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Admin />
                </Layout>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
