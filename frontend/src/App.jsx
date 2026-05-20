import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Projects from './pages/Projects.jsx';
import ProjectWorkspace from './pages/ProjectWorkspace.jsx';
import Tasks from './pages/Tasks.jsx';
import Updates from './pages/Updates.jsx';
import Users from './pages/Users.jsx';

const App = () => (
  <Routes>
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/register" element={<AuthPage mode="register" />} />
    <Route
      element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Dashboard />} />
      <Route path="projects" element={<Projects />} />
      <Route path="projects/:id" element={<ProjectWorkspace />} />
      <Route path="tasks" element={<Tasks />} />
      <Route path="updates" element={<Updates />} />
      <Route
        path="users"
        element={
          <ProtectedRoute roles={['Admin']}>
            <Users />
          </ProtectedRoute>
        }
      />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
