import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Trades from '@/pages/Trades';
import AddTrade from '@/pages/AddTrade';
import Analytics from '@/pages/Analytics';
import TradeDetail from '@/pages/TradeDetail';
import Layout from '@/components/Layout';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login setAuth={setIsAuthenticated} /> : <Navigate to="/" />} />
          <Route path="/register" element={!isAuthenticated ? <Register setAuth={setIsAuthenticated} /> : <Navigate to="/" />} />
          
          <Route element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/trades/add" element={<AddTrade />} />
            <Route path="/trades/:id" element={<TradeDetail />} />
            <Route path="/analytics" element={<Analytics />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;