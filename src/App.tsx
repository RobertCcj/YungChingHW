import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout/Layout';
import { ExplorePage } from './pages/ExplorePage/ExplorePage';
import { FavoritesPage } from './pages/FavoritesPage/FavoritesPage';
import { CallbackPage } from './pages/CallbackPage/CallbackPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <Router>
          <Routes>
            <Route path="/callback" element={<CallbackPage />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/explore" replace />} />
              <Route path="explore" element={<ExplorePage />} />
              <Route path="favorites" element={<FavoritesPage />} />
            </Route>
          </Routes>
        </Router>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;