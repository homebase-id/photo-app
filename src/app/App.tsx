import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, ReactNode, Suspense } from 'react';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '../components/ui/Layout/ErrorBoundary/ErrorBoundary';

import Layout from '../components/ui/Layout/Layout';
import LoadingDetailPage from '../components/ui/Layout/Loaders/LoadingDetailPage/LoadingDetailPage';
import useAuth from '../hooks/auth/useAuth';

const Photos = lazy(() => import('../templates/Photos/Photos'));
const NotFound = lazy(() => import('../templates/NotFound/NotFound'));
const Auth = lazy(() => import('../templates/Auth/Auth'));
const FinalizeAuth = lazy(() => import('../templates/Auth/FinalizeAuth'));

const AUTH_PATH = '/auth';

import './App.css';
const queryClient = new QueryClient();

function App() {
  return (
    <HelmetProvider>
      <Helmet>
        <meta name="v" content={import.meta.env.VITE_VERSION} />
      </Helmet>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Suspense>
            <Routes>
              <Route path="auth" element={<Auth />}></Route>
              <Route path="auth/finalize" element={<FinalizeAuth />}></Route>
              <Route
                path=""
                element={
                  <Layout>
                    <Suspense fallback={<LoadingDetailPage />}>
                      <ErrorBoundary>
                        <Outlet />
                      </ErrorBoundary>
                    </Suspense>
                  </Layout>
                }
              >
                <Route
                  path=""
                  element={
                    <RootRoute>
                      <Outlet />
                    </RootRoute>
                  }
                >
                  <Route path="" element={<Photos />}></Route>
                  <Route path="/album/:albumKey" element={<Photos />}></Route>
                  <Route path="/photo/:photoKey" element={<Photos />}></Route>
                </Route>
                <Route
                  path="*"
                  element={
                    <Layout>
                      <NotFound />
                    </Layout>
                  }
                />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

const RootRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    if (window.location.pathname === AUTH_PATH) {
      return <>{children}</>;
    }

    console.debug('[NOT AUTHENTICATED]: Redirect to login');

    // It can happen that the RootRoute renders when we already are rendering Login, which would cause and endless url of returnUrls; So return early if it is the login already
    if (window.location.pathname === AUTH_PATH) {
      return <></>;
    }

    return <Navigate to={`${AUTH_PATH}`} />;
  }

  return <>{children}</>;
};

export default App;
