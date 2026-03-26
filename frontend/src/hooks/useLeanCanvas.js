import { useReducer, useCallback } from 'react';
import { LEAN_CANVAS_BLOCKS, getLeanCanvasBlock } from '../types/leanCanvas';

const initialState = {
  currentBlock: 1,
  answers: {},
  isComplete: false,
  userName: 'You',
  conversation: [],
  isTyping: false,
  bootComplete: false,
  awaitingFollowUp: false,
  followUpIndex: 0
};

function leanCanvasReducer(state, action) {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        conversation: [...state.conversation, action.payload]
      };

    case 'SET_TYPING':
      return {
        ...state,
        isTyping: action.payload
      };

    case 'ADVANCE_BLOCK':
      const nextBlock = state.currentBlock + 1;
      if (nextBlock > 9) {
        return {
          ...state,
          isComplete: true,
          awaitingFollowUp: false,
          followUpIndex: 0
        };
      }
      return {
        ...state,
        currentBlock: nextBlock,
        awaitingFollowUp: false,
        followUpIndex: 0
      };

    case 'SET_ANSWER':
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.payload.block]: action.payload.answer
        }
      };

    case 'SET_AWAITING_FOLLOWUP':
      return {
        ...state,
        awaitingFollowUp: action.payload.awaiting,
        followUpIndex: action.payload.index || 0
      };

    case 'COMPLETE_CANVAS':
      return {
        ...state,
        isComplete: true
      };

    case 'SKIP_CANVAS':
      return {
        ...state,
        isComplete: true,
        skipped: true
      };

    case 'SET_BOOT_COMPLETE':
      return {
        ...state,
        bootComplete: true
      };

    case 'SET_USERNAME':
      return {
        ...state,
        userName: action.payload
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

export function useLeanCanvas() {
  const [state, dispatch] = useReducer(leanCanvasReducer, initialState);

  const addMessage = useCallback((message) => {
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        ...message
      }
    });
  }, []);

  const setTyping = useCallback((isTyping) => {
    dispatch({ type: 'SET_TYPING', payload: isTyping });
  }, []);

  const advanceBlock = useCallback(() => {
    dispatch({ type: 'ADVANCE_BLOCK' });
  }, []);

  const setAnswer = useCallback((block, answer) => {
    dispatch({ type: 'SET_ANSWER', payload: { block, answer } });
  }, []);

  const setAwaitingFollowUp = useCallback((awaiting, index = 0) => {
    dispatch({ type: 'SET_AWAITING_FOLLOWUP', payload: { awaiting, index } });
  }, []);

  const completeCanvas = useCallback(() => {
    dispatch({ type: 'COMPLETE_CANVAS' });
  }, []);

  const skipCanvas = useCallback(() => {
    dispatch({ type: 'SKIP_CANVAS' });
  }, []);

  const setBootComplete = useCallback(() => {
    dispatch({ type: 'SET_BOOT_COMPLETE' });
  }, []);

  const setUserName = useCallback((name) => {
    dispatch({ type: 'SET_USERNAME', payload: name });
  }, []);

  const getCurrentBlock = useCallback(() => {
    return getLeanCanvasBlock(state.currentBlock);
  }, [state.currentBlock]);

  const getCanvasData = useCallback(() => {
    return {
      leanCanvas: state.answers,
      isComplete: state.isComplete,
      skipped: state.skipped || false
    };
  }, [state.answers, state.isComplete, state.skipped]);

  return {
    state,
    addMessage,
    setTyping,
    advanceBlock,
    setAnswer,
    setAwaitingFollowUp,
    completeCanvas,
    skipCanvas,
    setBootComplete,
    setUserName,
    getCurrentBlock,
    getCanvasData,
    LEAN_CANVAS_BLOCKS
  };
}

export default useLeanCanvas;
