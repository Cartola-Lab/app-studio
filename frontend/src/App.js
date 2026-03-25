import React, { useState, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { StudioProvider } from './context/StudioContext';
import { Header } from './components/Header';
import { ChatPanel } from './components/ChatPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { ActionBar } from './components/ActionBar';
import { Toaster } from 'sonner';
import './App.css';

function StudioLayout() {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[#0A0A0A] overflow-hidden">
      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 pt-14 flex flex-col overflow-hidden">
        {/* Split Panel Layout */}
        <div className="flex-1 overflow-hidden">
          <PanelGroup 
            direction="horizontal" 
            className="h-full"
          >
            {/* Chat Panel */}
            <Panel 
              defaultSize={50} 
              minSize={30}
              className="flex"
            >
              <ChatPanel />
            </Panel>

            {/* Resizable Divider */}
            <PanelResizeHandle 
              data-testid="split-pane-divider"
              onDragging={(dragging) => dragging ? handleDragStart() : handleDragEnd()}
              className={`
                w-1 
                bg-[#22222A] 
                hover:bg-[#19AFFF] 
                active:bg-[#19AFFF] 
                transition-colors 
                cursor-col-resize
                ${isDragging ? 'bg-[#19AFFF]' : ''}
              `}
            />

            {/* Preview Panel */}
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

        {/* Action Bar */}
        <ActionBar />
      </main>

      {/* Toast Notifications */}
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
    </div>
  );
}

function App() {
  return (
    <StudioProvider>
      <StudioLayout />
    </StudioProvider>
  );
}

export default App;
