import React, { createContext, useContext, useReducer } from 'react';

// Types
const initialPreviewState = {
  html: '',
  css: '',
  js: '',
  lastUpdated: null
};

const initialState = {
  // Chat
  messages: [],
  isStreaming: false,
  sessionId: `session-${Date.now()}`,
  
  // Preview
  preview: initialPreviewState,
  previewMode: 'preview', // 'preview' | 'code'
  viewport: 'desktop', // 'desktop' | 'tablet' | 'mobile'
  
  // Task
  briefing: null,
  taskCreated: false,
  createdIssueId: null,
  createdIdentifier: null,
  
  // Settings
  settingsOpen: false,
  
  // Lean Canvas Context
  leanCanvasContext: null
};

// Reducer
function studioReducer(state, action) {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };
    
    case 'UPDATE_STREAMING_MESSAGE':
      const messages = [...state.messages];
      const lastIndex = messages.length - 1;
      if (lastIndex >= 0 && messages[lastIndex].role === 'assistant') {
        messages[lastIndex] = {
          ...messages[lastIndex],
          content: messages[lastIndex].content + action.payload
        };
      }
      return { ...state, messages };
    
    case 'SET_STREAMING':
      return { ...state, isStreaming: action.payload };
    
    case 'UPDATE_PREVIEW':
      return {
        ...state,
        preview: {
          ...state.preview,
          ...action.payload,
          lastUpdated: new Date()
        }
      };
    
    case 'SET_PREVIEW_MODE':
      return { ...state, previewMode: action.payload };
    
    case 'SET_VIEWPORT':
      return { ...state, viewport: action.payload };
    
    case 'SET_BRIEFING':
      return { ...state, briefing: action.payload };
    
    case 'TASK_CREATED':
      return {
        ...state,
        taskCreated: true,
        createdIssueId: action.payload.issueId,
        createdIdentifier: action.payload.identifier
      };
    
    case 'NEW_SESSION':
      return {
        ...initialState,
        sessionId: `session-${Date.now()}`
      };
    
    case 'TOGGLE_SETTINGS':
      return { ...state, settingsOpen: !state.settingsOpen };
    
    case 'CLOSE_SETTINGS':
      return { ...state, settingsOpen: false };
    
    case 'SET_LEAN_CANVAS_CONTEXT':
      return { ...state, leanCanvasContext: action.payload };
    
    default:
      return state;
  }
}

// Context
const StudioContext = createContext(null);

// Provider
export function StudioProvider({ children }) {
  const [state, dispatch] = useReducer(studioReducer, initialState);

  const value = {
    state,
    dispatch,
    
    // Helper actions
    addMessage: (message) => {
      dispatch({ type: 'ADD_MESSAGE', payload: message });
    },
    
    updateStreamingMessage: (text) => {
      dispatch({ type: 'UPDATE_STREAMING_MESSAGE', payload: text });
    },
    
    setStreaming: (isStreaming) => {
      dispatch({ type: 'SET_STREAMING', payload: isStreaming });
    },
    
    updatePreview: (preview) => {
      dispatch({ type: 'UPDATE_PREVIEW', payload: preview });
    },
    
    setPreviewMode: (mode) => {
      dispatch({ type: 'SET_PREVIEW_MODE', payload: mode });
    },
    
    setViewport: (viewport) => {
      dispatch({ type: 'SET_VIEWPORT', payload: viewport });
    },
    
    setBriefing: (briefing) => {
      dispatch({ type: 'SET_BRIEFING', payload: briefing });
    },
    
    taskCreated: (issueId, identifier) => {
      dispatch({ type: 'TASK_CREATED', payload: { issueId, identifier } });
    },
    
    newSession: () => {
      dispatch({ type: 'NEW_SESSION' });
    },
    
    toggleSettings: () => {
      dispatch({ type: 'TOGGLE_SETTINGS' });
    },
    
    closeSettings: () => {
      dispatch({ type: 'CLOSE_SETTINGS' });
    },
    
    setLeanCanvasContext: (context) => {
      dispatch({ type: 'SET_LEAN_CANVAS_CONTEXT', payload: context });
    }
  };

  return (
    <StudioContext.Provider value={value}>
      {children}
    </StudioContext.Provider>
  );
}

// Hook
export function useStudio() {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
}

export default StudioContext;
