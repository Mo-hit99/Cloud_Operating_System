import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { LaunchInstance } from './pages/LaunchInstance';
import { InstanceDetail } from './pages/InstanceDetail';
import { OSManager } from './pages/OSManager';
import { ProtectedRoute } from './components/ProtectedRoute';

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {!isAuthPage && (
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile Navbar */}
            <Navbar onMenuClick={() => setSidebarOpen(true)} />
            
            {/* Page Content */}
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/launch" element={
                  <ProtectedRoute>
                    <LaunchInstance />
                  </ProtectedRoute>
                } />
                <Route path="/instances/:id" element={
                  <ProtectedRoute>
                    <InstanceDetail />
                  </ProtectedRoute>
                } />
                <Route path="/instances" element={
                  <ProtectedRoute>
                    <OSManager />
                  </ProtectedRoute>
                } />
              </Routes>
            </main>
          </div>
        </div>
      )}
      
      {isAuthPage && (
        <main className="min-h-screen">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </main>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <AppContent />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;