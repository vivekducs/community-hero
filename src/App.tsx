import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AnimatedRoutes from './components/AnimatedRoutes';
import InstallBanner from './components/InstallBanner';

export default function App() {
  return (
    <>
      <InstallBanner />
      <BrowserRouter>
        <AuthProvider>
          <AnimatedRoutes />
        </AuthProvider>
      </BrowserRouter>
    </>
  );
}
