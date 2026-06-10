import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Layout from './components/layout/Layout';
import Dashboard from './services/pages/Dashboard';
import Shipments from './services/pages/Shipments';
import NewShipment from './services/pages/NewShipment';
import Sensors from './services/pages/Sensors';
import NewSensor from './services/pages/NewSensor';
import Alerts from './services/pages/Alerts';
import Excursions from './services/pages/Excursions';
import Reports from './services/pages/Reports';
import Users from './services/pages/Users';
import Login from './services/pages/Login';
import './styles/global.css';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/shipments" element={<ProtectedRoute><Shipments /></ProtectedRoute>} />
            <Route path="/shipments/new" element={<ProtectedRoute><NewShipment /></ProtectedRoute>} />
            <Route path="/sensors" element={<ProtectedRoute><Sensors /></ProtectedRoute>} />
            <Route path="/sensors/new" element={<ProtectedRoute><NewSensor /></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
            <Route path="/excursions" element={<ProtectedRoute><Excursions /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
