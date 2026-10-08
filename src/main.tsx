import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import './index.css';
import { SiteLayout } from './components/SiteLayout';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Checkout from './pages/Checkout';
import OrderPage from './pages/OrderPage';
import Track from './pages/Track';
import Events from './pages/Events';
import { Spinner } from './components/ui';

// Staff screens and the queue board load on demand so customers download less.
const Board = lazy(() => import('./pages/Board'));
const StaffLayout = lazy(() => import('./pages/staff/StaffLayout'));
const POS = lazy(() => import('./pages/staff/POS'));
const Orders = lazy(() => import('./pages/staff/Orders'));
const Kitchen = lazy(() => import('./pages/staff/Kitchen'));
const MenuManager = lazy(() => import('./pages/staff/MenuManager'));
const Inquiries = lazy(() => import('./pages/staff/Inquiries'));
const Reports = lazy(() => import('./pages/staff/Reports'));
const Promos = lazy(() => import('./pages/staff/Promos'));

const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/menu', element: <Menu /> },
      { path: '/checkout', element: <Checkout /> },
      { path: '/order/:id', element: <OrderPage /> },
      { path: '/track', element: <Track /> },
      { path: '/events', element: <Events /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
  { path: '/board', element: <Board /> },
  {
    path: '/staff',
    element: <StaffLayout />,
    children: [
      { index: true, element: <Navigate to="/staff/pos" replace /> },
      { path: 'pos', element: <POS /> },
      { path: 'orders', element: <Orders /> },
      { path: 'kitchen', element: <Kitchen /> },
      { path: 'menu', element: <MenuManager /> },
      { path: 'events', element: <Inquiries /> },
      { path: 'reports', element: <Reports /> },
      { path: 'promos', element: <Promos /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<div className="grid min-h-screen place-items-center"><Spinner /></div>}>
      <RouterProvider router={router} />
    </Suspense>
  </StrictMode>,
);
