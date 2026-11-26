import { createHashRouter, Navigate, RouterProvider, type RouteObject } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth';
import { LoginPage } from './auth/LoginPage';
import { AppLayout } from './layout/AppLayout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { CollectionPage } from './features/items/CollectionPage';
import { ItemDetailPage } from './features/items/ItemDetailPage';
import { CatalogPage } from './features/catalog/CatalogPage';
import { PurchasesPage } from './features/purchases/PurchasesPage';
import { SalesPage } from './features/sales/SalesPage';
import { PreordersPage } from './features/preorders/PreordersPage';
import { StoresPage } from './features/stores/StoresPage';
import { StoreDetailPage } from './features/stores/StoreDetailPage';
import { OpenBoxPage } from './features/boxes/OpenBoxPage';
import { LedgerPage } from './features/ledger/LedgerPage';
import { WishlistPage } from './features/wishlist/WishlistPage';
import { ShowcasePage } from './features/showcase/ShowcasePage';

export const routes: RouteObject[] = [
  { path: '/vetrina', element: <ShowcasePage /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/collezione', element: <CollectionPage /> },
      { path: '/collezione/:id', element: <ItemDetailPage /> },
      { path: '/box/:id/apri', element: <OpenBoxPage /> },
      { path: '/catalogo', element: <CatalogPage /> },
      { path: '/acquisti', element: <PurchasesPage /> },
      { path: '/vendite', element: <SalesPage /> },
      { path: '/preordini', element: <PreordersPage /> },
      { path: '/negozi', element: <StoresPage /> },
      { path: '/negozi/:id', element: <StoreDetailPage /> },
      { path: '/conti', element: <LedgerPage /> },
      { path: '/wishlist', element: <WishlistPage /> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
];

const router = createHashRouter(routes);

export function App() {
  return <RouterProvider router={router} />;
}
