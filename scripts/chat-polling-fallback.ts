// Fallback polling solution for chat when real-time is not available
// Add this to your chat component as a backup

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export const useChatPolling = (
  conversationId: string,
  currentMessages: Message[],
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void,
  userId: string,
  isEnabled = false
) => {
  const pollingInterval = useRef<NodeJS.Timeout>();
  const lastMessageId = useRef<string>();

  useEffect(() => {
    if (!isEnabled || !conversationId) return;

    // Set the last message ID
    if (currentMessages.length > 0) {
      lastMessageId.current = currentMessages[currentMessages.length - 1].id;
    }

    // Poll for new messages every 2 seconds
    pollingInterval.current = setInterval(async () => {
      try {
        const query = supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        // Only get messages newer than the last one we have
        if (lastMessageId.current) {
          query.gt('created_at', 
            currentMessages.find(m => m.id === lastMessageId.current)?.created_at || new Date().toISOString()
          );
        }

        const { data: newMessages, error } = await query;

        if (error) {
          console.error('Polling error:', error);
          return;
        }

        if (newMessages && newMessages.length > 0) {
          console.log('📨 Polling found new messages:', newMessages.length);
          
          // Add new messages to the state
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));
            
            if (uniqueNewMessages.length > 0) {
              // Update last message ID
              lastMessageId.current = uniqueNewMessages[uniqueNewMessages.length - 1].id;
              
              // Mark messages as read if they're not from current user
              uniqueNewMessages.forEach(message => {
                if (message.sender_id !== userId) {
                  supabase
                    .from('messages')
                    .update({ read: true })
                    .eq('id', message.id)
                    .then(({ error }) => {
                      if (error) console.error('Error marking message as read:', error);
                    });
                }
              });
              
              return [...prev, ...uniqueNewMessages];
            }
            
            return prev;
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [conversationId, isEnabled, userId]);

  // Update last message ID when messages change
  useEffect(() => {
    if (currentMessages.length > 0) {
      lastMessageId.current = currentMessages[currentMessages.length - 1].id;
    }
  }, [currentMessages]);

  return {
    stopPolling: () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    }
  };
};