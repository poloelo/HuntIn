import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Radar, Clock, PlusCircle } from 'lucide-react';
import NewSearch from './pages/NewSearch';
import Results from './pages/Results';
import History from './pages/History';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="sidebar">
          <div className="logo">
            <Radar size={28} className="logo-icon" />
            <span className="logo-text">TalentRadar</span>
          </div>
          <div className="nav-links">
            <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <PlusCircle size={18} /> New Search
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Clock size={18} /> History
            </NavLink>
          </div>
          <div className="sidebar-footer">
            <span className="version">v1.0.0</span>
          </div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<NewSearch />} />
            <Route path="/history" element={<History />} />
            <Route path="/results/:id" element={<Results />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
