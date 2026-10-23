import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './features/landing/Landing';
import Dashboard from './features/analytics/Dashboard';
import EditorPage from './features/editor/EditorPage';
import AppLayout from './components/layout/AppLayout';

function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/analytics" element={<Navigate to="/dashboard" state={{ tab: 'analytics' }} replace />} />
          <Route path="/report" element={<Navigate to="/dashboard" state={{ tab: 'report' }} replace />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}

export default App;
