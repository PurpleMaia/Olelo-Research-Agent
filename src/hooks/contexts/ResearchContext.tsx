'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';
import type {
  ResearchStatus,
  ActivityMessage,
  ClarifyingQuestion,
  QuestionAnswer,
  ResearchResult,
} from '@/types/research';

interface ResearchState {
  sessionId: string | null;
  status: ResearchStatus;
  query: string;
  clarifyingQuestions: ClarifyingQuestion[];
  answers: QuestionAnswer[];
  activityStream: ActivityMessage[];
  results: ResearchResult | null;
  error: string | null;
}

type ResearchAction =
  | { type: 'INIT_RESEARCH'; payload: { query: string; sessionId: string } }
  | { type: 'SET_STATUS'; payload: ResearchStatus }
  | { type: 'ADD_CLARIFYING_QUESTIONS'; payload: ClarifyingQuestion[] }
  | { type: 'SUBMIT_ANSWERS'; payload: QuestionAnswer[] }
  | { type: 'ADD_ACTIVITY'; payload: ActivityMessage }
  | { type: 'ADD_ACTIVITIES'; payload: ActivityMessage[] }
  | { type: 'UPDATE_RESULTS'; payload: Partial<ResearchResult> }
  | { type: 'SET_RESULTS'; payload: ResearchResult }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' };

const initialState: ResearchState = {
  sessionId: null,
  status: 'idle',
  query: '',
  clarifyingQuestions: [],
  answers: [],
  activityStream: [],
  results: null,
  error: null,
};

function researchReducer(state: ResearchState, action: ResearchAction): ResearchState {
  switch (action.type) {
    case 'INIT_RESEARCH':
      return {
        ...state,
        query: action.payload.query,
        sessionId: action.payload.sessionId,
        status: 'researching',
        activityStream: [],
        results: null,
        error: null,
      };

    case 'SET_STATUS':
      return {
        ...state,
        status: action.payload,
      };

    case 'ADD_CLARIFYING_QUESTIONS':
      return {
        ...state,
        status: 'clarifying',
        clarifyingQuestions: action.payload,
      };

    case 'SUBMIT_ANSWERS':
      return {
        ...state,
        answers: action.payload,
        status: 'researching',
      };

    case 'ADD_ACTIVITY':
      return {
        ...state,
        activityStream: [...state.activityStream, action.payload],
      };

    case 'ADD_ACTIVITIES':
      return {
        ...state,
        activityStream: [...state.activityStream, ...action.payload],
      };

    case 'UPDATE_RESULTS':
      return {
        ...state,
        results: state.results
          ? { ...state.results, ...action.payload }
          : (action.payload as ResearchResult),
      };

    case 'SET_RESULTS':
      return {
        ...state,
        results: action.payload,
        status: 'complete',
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        status: 'error',
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

interface ResearchContextType {
  state: ResearchState;
  dispatch: React.Dispatch<ResearchAction>;
  initiateResearch: (query: string) => Promise<void>;
  submitAnswers: (answers: QuestionAnswer[]) => Promise<void>;
  reset: () => void;
}

const ResearchContext = createContext<ResearchContextType | undefined>(undefined);

export function ResearchProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(researchReducer, initialState);

  const initiateResearch = async (query: string) => {
    try {
      const response = await fetch('/api/research/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query }),
      });

      // Notify the sidebar to refresh its session list (a session was created even if it errors)
      window.dispatchEvent(new Event('research-started'));

      if (!response.ok) {
        throw new Error('Failed to initiate research');
      }

      const data = await response.json();

      // Check if we got clarifying questions
      if (data.clarifyingQuestions && data.clarifyingQuestions.length > 0) {
        dispatch({
          type: 'ADD_CLARIFYING_QUESTIONS',
          payload: data.clarifyingQuestions,
        });
        dispatch({
          type: 'INIT_RESEARCH',
          payload: { query, sessionId: data.sessionId },
        });
        dispatch({ type: 'SET_STATUS', payload: 'clarifying' });
      } else {
        // Start research immediately
        dispatch({
          type: 'INIT_RESEARCH',
          payload: { query, sessionId: data.sessionId },
        });
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  const submitAnswers = async (answers: QuestionAnswer[]) => {
    if (!state.sessionId) {
      dispatch({ type: 'SET_ERROR', payload: 'No active research session' });
      return;
    }

    try {
      const response = await fetch('/api/research/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: state.sessionId,
          answers,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit answers');
      }

      dispatch({ type: 'SUBMIT_ANSWERS', payload: answers });
      dispatch({ type: 'SET_STATUS', payload: 'researching' });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  const reset = () => {
    dispatch({ type: 'RESET' });
  };

  return (
    <ResearchContext.Provider
      value={{
        state,
        dispatch,
        initiateResearch,
        submitAnswers,
        reset,
      }}
    >
      {children}
    </ResearchContext.Provider>
  );
}

export function useResearch() {
  const context = useContext(ResearchContext);
  if (context === undefined) {
    throw new Error('useResearch must be used within a ResearchProvider');
  }
  return context;
}
