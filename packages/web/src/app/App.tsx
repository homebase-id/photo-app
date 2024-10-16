import { lazy, ReactNode, Suspense } from 'react';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import {
  Route,
  Outlet,
  Navigate,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router-dom';
import { ErrorBoundary } from '../components/ui/Layout/ErrorBoundary/ErrorBoundary';

import Layout from '../components/ui/Layout/Layout';
import LoadingDetailPage from '../components/ui/Layout/Loaders/LoadingDetailPage/LoadingDetailPage';
import useAuth from '../hooks/auth/useAuth';
import { OdinQueryClient } from './OdinQueryClient';

const About = lazy(() => import('../templates/About/About'));
const Photos = lazy(() => import('../templates/Photos/Photos'));
const Albums = lazy(() => import('../templates/Albums/Albums'));
const PhotosBin = lazy(() => import('../templates/Photos/PhotosBin'));
const PhotosArchive = lazy(() => import('../templates/Photos/PhotosArchive'));
const PhotosFromApps = lazy(() => import('../templates/Photos/PhotosFromApps'));
const PhotosFavorites = lazy(() => import('../templates/Photos/PhotosFavorites'));
const NotFound = lazy(() => import('../templates/NotFound/NotFound'));
const Auth = lazy(() => import('../templates/Auth/Auth'));
const FinalizeAuth = lazy(() => import('../templates/Auth/FinalizeAuth'));
const GoogleTakeoutImport = lazy(() => import('../templates/Import/GoogleTakeoutImport'));
const VideoPlayer = lazy(() => import('../templates/VideoPlayer/VideoPlayer'));

const AUTH_PATH = '/auth';

import './App.css';
import { DotYouClientProvider } from '../components/Auth/DotYouClientProvider';
import Debug from '../templates/Debug/debug';

export const REACT_QUERY_CACHE_KEY = 'PHOTO_REACT_QUERY_OFFLINE_CACHE';

// Explicit includes to avoid persisting media items, or large data in general
const INCLUDED_QUERY_KEYS = [
  'album',
  'album-thumb',
  'albums',
  'photo-header',
  'photo-library',
  'photo-meta',
  'photos',
  'photos-infinite',
];

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route path="about" element={<About />}></Route>
        <Route path="auth" element={<Auth />}></Route>
        <Route path="auth/finalize" element={<FinalizeAuth />}></Route>
        <Route
          path=""
          element={
            <RootRoute>
              <DotYouClientProvider>
                <Outlet />
              </DotYouClientProvider>
            </RootRoute>
          }
        >
          <Route path="/player/:photoKey" element={<VideoPlayer />}></Route>

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
            <Route path="" element={<Photos />}></Route>
            <Route path="/albums" element={<Albums />}></Route>
            <Route path="/album/:albumKey" element={<Photos />}></Route>
            <Route path="/album/:albumKey/photo/:photoKey" element={<Photos />}></Route>
            <Route path="/photo/:photoKey" element={<Photos />}></Route>

            <Route path="/favorites" element={<PhotosFavorites />}></Route>
            <Route path="/favorites/photo/:photoKey" element={<PhotosFavorites />}></Route>
            <Route path="/archive" element={<PhotosArchive />}></Route>
            <Route path="/archive/photo/:photoKey" element={<PhotosArchive />}></Route>
            <Route path="/apps" element={<PhotosFromApps />}></Route>
            <Route path="/apps/photo/:photoKey" element={<PhotosFromApps />}></Route>
            <Route path="/bin" element={<PhotosBin />}></Route>
            <Route path="/bin/photo/:photoKey" element={<PhotosBin />}></Route>

            <Route path="/import" element={<GoogleTakeoutImport />}></Route>
            <Route path="/debug" element={<Debug />}></Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </>
    )
  );

  return (
    <HelmetProvider>
      <Helmet>
        <meta name="v" content={import.meta.env.VITE_VERSION} />
      </Helmet>
      <OdinQueryClient
        cacheKey={REACT_QUERY_CACHE_KEY}
        cachedQueryKeys={INCLUDED_QUERY_KEYS}
        type={'indexeddb'}
      >
        <RouterProvider router={router} fallbackElement={<></>} />
      </OdinQueryClient>
    </HelmetProvider>
  );
}

const RootRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    if (window.location.pathname === AUTH_PATH) return <>{children}</>;

    console.debug('[NOT AUTHENTICATED]: Redirect to "login"');
    // It can happen that the RootRoute renders when we already are rendering Login, which would cause and endless url of returnUrls; So return early if it is the login already
    if (window.location.pathname === AUTH_PATH) return <></>;

    return <Navigate to={`/about`} />;
  }

  return <>{children}</>;
};

export default App;
