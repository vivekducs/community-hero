import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import ProtectedRoute from './ProtectedRoute';
import Layout from './Layout';
import AnimatedPage from './AnimatedPage';

// Views
import Home from '../views/Home';
import Login from '../views/Login';
import Signup from '../views/Signup';
import Report from '../views/Report';
import Issues from '../views/Issues';
import IssueDetail from '../views/IssueDetail';
import Dashboard from '../views/Dashboard';
import Profile from '../views/Profile';
import Admin from '../views/Admin';
import Leaderboard from '../views/Leaderboard';

export default function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <div key={location.pathname} className="w-full">
        <Routes location={location}>
          {/* Public authentication paths */}
          <Route path="/login" element={<AnimatedPage><Login /></AnimatedPage>} />
        <Route path="/signup" element={<AnimatedPage><Signup /></AnimatedPage>} />

        {/* Core App Layout Paths */}
        <Route 
          path="/" 
          element={
            <Layout>
              <AnimatedPage><Home /></AnimatedPage>
            </Layout>
          } 
        />
        <Route 
          path="/report" 
          element={
            <ProtectedRoute>
              <Layout>
                <AnimatedPage><Report /></AnimatedPage>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/issues" 
          element={
            <ProtectedRoute>
              <Layout>
                <AnimatedPage><Issues /></AnimatedPage>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/issues/:issueId" 
          element={
            <ProtectedRoute>
              <Layout>
                <AnimatedPage><IssueDetail /></AnimatedPage>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Layout>
                <AnimatedPage><Dashboard /></AnimatedPage>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/leaderboard" 
          element={
            <ProtectedRoute>
              <Layout>
                <AnimatedPage><Leaderboard /></AnimatedPage>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Layout>
                <AnimatedPage><Profile /></AnimatedPage>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <Layout>
                <AnimatedPage><Admin /></AnimatedPage>
              </Layout>
            </ProtectedRoute>
          } 
        />
        </Routes>
      </div>
    </AnimatePresence>
  );
}
