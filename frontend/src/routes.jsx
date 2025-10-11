import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Upload from './pages/Upload';
import Paramedic from './pages/Paramedic';
import AuditLog from './pages/AuditLog';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Upload />,
      },
      {
        path: 'paramedic',
        element: <Paramedic />,
      },
      {
        path: 'audit',
        element: <AuditLog />,
      },
    ],
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
});
