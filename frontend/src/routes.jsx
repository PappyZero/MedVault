// src/routes.jsx
import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Upload from './pages/Upload';
import AuditLog from './pages/AuditLog';
import Paramedic from './pages/Paramedic';
import ErrorBoundary from './components/ErrorBoundary';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        path: '/',
        element: <Upload />
      },
      {
        path: '/audit-log',
        element: <AuditLog />
      },
      {
        path: '/paramedic',
        element: <Paramedic />
      }
    ]
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    // v7_throwAbortReason: true,
  }
});

export default router;