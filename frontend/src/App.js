import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { StudioProvider, useStudio } from './context/StudioContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { ChatPanel } from './components/ChatPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { ActionBar } from './components/ActionBar';
import { GitHubCallback } from './components/GitHubCallback';
import LeanCanvasTerminal from './pages/LeanCanvasTerminal';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import GoogleCallback from './pages/GoogleCallback';
import { Toaster } from 'sonner';
import './App.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#555] text-sm">Carregando...</div>
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function StudioLayout() {
  const [isDragging, setIsDragging] = useState(false);
  const location = useLocation();
  const { setLeanCanvasContext } = useStudio();

  const leanCanvasData = location.state?.leanCanvas;
  const skippedCanvas = location.state?.skipped;

  React.useEffect(() => {
    if (leanCanvasData && !skippedCanvas) {
      setLeanCanvasContext(leanCanvasData);
    }
  }, [leanCanvasData, skippedCanvas, setLeanCanvasContext]);

  const handleDragStart = useCallback(() => setIsDragging(true), []);
  const handleDragEnd = useCallback(() => setIsDragging(false), []);

  return (
    <div className="h-screen flex flex-col bg-[#0A0A0A] overflow-hidden">
      <Header />
      <main className="flex-1 pt-14 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <PanelGroup direction="horizontal" className="h-full">
            <Panel defaultSize={50} minSize={30} className="flex">
              <ChatPanel />
            </Panel>
            <PanelResizeHandle
              data-testid="split-pane-divider"
              onDragging={(dragging) => (dragging ? handleDragStart() : handleDragEnd())}
              className={`w-1 bg-[#22222A] hover:bg-[#19AFFF] active:bg-[#19AFFF] transition-colors cursor-col-resize ${
                isDragging ? 'bg-[#19AFFF]' : ''
              }`}
            />
            <Panel
              defaultSize={50}
              minSize={30}
              className="flex"
              style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
            >
              <PreviewPanel />
            </Panel>
          </PanelGroup>
        </div>
        <ActionBar />
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StudioProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/github/callback" element={<GitHubCallback />} />
            <Route path="/auth/google/callback" element={<GoogleCallback />} />

            {/* Protected */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <LeanCanvasTerminal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/studio"
              element={
                <ProtectedRoute>
                  <StudioLayout />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#111115',
                border: '1px solid #22222A',
                color: '#EDEDED',
              },
            }}
          />
        </StudioProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
