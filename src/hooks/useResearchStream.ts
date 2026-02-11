'use client';

import { useEffect, useRef } from 'react';
import { useResearch } from './contexts/ResearchContext';
import type { StreamEvent, ActivityMessage, ResearchResult } from '@/types/research';

interface UseResearchStreamOptions {
  sessionId: string | null;
  enabled?: boolean;
}

export function useResearchStream({ sessionId, enabled = true }: UseResearchStreamOptions) {
  const { dispatch } = useResearch();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Don't connect if disabled or no session ID
    if (!enabled || !sessionId) {
      return;
    }

    // Create EventSource connection
    const eventSource = new EventSource(`/api/research/stream/${sessionId}`);
    eventSourceRef.current = eventSource;

    // Handle incoming messages
    eventSource.onmessage = (event) => {
      try {
        const streamEvent: StreamEvent = JSON.parse(event.data);

        switch (streamEvent.type) {
          case 'activity':
            // Add activity message to stream
            dispatch({
              type: 'ADD_ACTIVITY',
              payload: streamEvent.data as ActivityMessage,
            });
            break;

          case 'result':
            // Update results progressively
            dispatch({
              type: 'UPDATE_RESULTS',
              payload: streamEvent.data as Partial<ResearchResult>,
            });
            break;

          case 'complete':
            // Research complete
            dispatch({ type: 'SET_STATUS', payload: 'complete' });
            eventSource.close();
            break;

          case 'error':
            // Handle error
            const errorData = streamEvent.data as { error: string };
            dispatch({ type: 'SET_ERROR', payload: errorData.error });
            eventSource.close();
            break;

          case 'questions':
            // Received clarifying questions mid-research (edge case)
            dispatch({
              type: 'ADD_CLARIFYING_QUESTIONS',
              payload: streamEvent.data as any,
            });
            break;

          default:
            console.warn('Unknown stream event type:', streamEvent);
        }
      } catch (error) {
        console.error('Error parsing stream event:', error);
      }
    };

    // Handle connection errors
    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);

      // Only set error state if we're not already complete
      if (eventSource.readyState === EventSource.CLOSED) {
        dispatch({
          type: 'SET_ERROR',
          payload: 'Connection to research stream lost',
        });
      }

      eventSource.close();
    };

    // Cleanup on unmount
    return () => {
      if (eventSource.readyState !== EventSource.CLOSED) {
        eventSource.close();
      }
    };
  }, [sessionId, enabled, dispatch]);

  // Function to manually close the stream
  const closeStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  return { closeStream };
}
