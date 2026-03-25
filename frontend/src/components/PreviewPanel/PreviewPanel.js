import React from 'react';
import { useStudio } from '../../context/StudioContext';
import { PreviewFrame } from './PreviewFrame';
import { CodeView } from './CodeView';
import { ViewportToggle } from './ViewportToggle';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Eye, Code2 } from 'lucide-react';

export function PreviewPanel() {
  const { state, setPreviewMode, setViewport } = useStudio();

  return (
    <div 
      data-testid="preview-panel"
      className="flex-1 flex flex-col min-w-[300px] bg-[#0A0A0A] overflow-hidden"
    >
      {/* Action Bar */}
      <div className="h-12 border-b border-[#22222A] flex items-center justify-between px-4 bg-[#111115]">
        {/* Preview/Code Toggle */}
        <Tabs 
          value={state.previewMode} 
          onValueChange={setPreviewMode}
          className="h-full"
        >
          <TabsList className="h-full bg-transparent p-0 gap-1">
            <TabsTrigger 
              value="preview"
              data-testid="preview-tab-btn"
              className="data-[state=active]:bg-[#19AFFF]/10 data-[state=active]:text-[#19AFFF] text-[#6A6A75] hover:text-[#EDEDED] rounded-md px-3 py-1.5 h-8"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </TabsTrigger>
            <TabsTrigger 
              value="code"
              data-testid="code-tab-btn"
              className="data-[state=active]:bg-[#19AFFF]/10 data-[state=active]:text-[#19AFFF] text-[#6A6A75] hover:text-[#EDEDED] rounded-md px-3 py-1.5 h-8"
            >
              <Code2 className="w-4 h-4 mr-2" />
              Code
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Viewport Toggle */}
        {state.previewMode === 'preview' && (
          <ViewportToggle 
            viewport={state.viewport} 
            onChange={setViewport} 
          />
        )}
      </div>

      {/* Content */}
      {state.previewMode === 'preview' ? (
        <PreviewFrame 
          preview={state.preview} 
          viewport={state.viewport} 
        />
      ) : (
        <CodeView preview={state.preview} />
      )}
    </div>
  );
}

export default PreviewPanel;
