import React, { useMemo, useRef, useState, useEffect } from 'react';
import { buildSrcdoc } from '../../utils/srcdocBuilder';
import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

export function PreviewFrame({ preview, viewport }) {
  const iframeRef = useRef(null);
  const [key, setKey] = useState(0);

  const srcdoc = useMemo(() => buildSrcdoc(preview), [preview]);

  const viewportWidth = useMemo(() => {
    switch (viewport) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      default:
        return '100%';
    }
  }, [viewport]);

  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  // Check if preview has any content
  const hasContent = preview.html || preview.css || preview.js;

  return (
    <div 
      data-testid="preview-frame-container"
      className="flex-1 flex flex-col items-center justify-center bg-[#0A0A0A] p-4 overflow-auto"
    >
      {hasContent ? (
        <div 
          className="preview-frame bg-white rounded-md overflow-hidden shadow-lg transition-all duration-300"
          style={{ 
            width: viewportWidth, 
            maxWidth: '100%',
            height: viewport === 'mobile' ? '667px' : viewport === 'tablet' ? '500px' : '100%',
            minHeight: '400px'
          }}
        >
          <iframe
            key={key}
            ref={iframeRef}
            title="Preview"
            srcDoc={srcdoc}
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border-0"
          />
        </div>
      ) : (
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-[#1A1A20] flex items-center justify-center mb-4 mx-auto">
            <RefreshCw className="w-8 h-8 text-[#6A6A75]" />
          </div>
          <h4 className="text-[#A0A0AB] text-sm font-medium mb-1">No Preview Yet</h4>
          <p className="text-[#6A6A75] text-xs max-w-xs">
            Start a conversation with BroStorm. When code is generated, it will appear here.
          </p>
        </div>
      )}

      {hasContent && (
        <Button
          data-testid="preview-refresh-btn"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="mt-4 border-[#22222A] bg-[#111115] text-[#A0A0AB] hover:text-[#EDEDED] hover:bg-[#1A1A20]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Preview
        </Button>
      )}
    </div>
  );
}

export default PreviewFrame;
