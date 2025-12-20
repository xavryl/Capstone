import { useEffect, useRef } from 'react';
import { createChat } from '@n8n/chat';
import '@n8n/chat/dist/style.css';
import './ai-chat.css';

export default function AIChatWidget() {
  // 1. Use a Ref to track if we already built the chat
  const isInitialized = useRef(false);

  useEffect(() => {
    // 2. If already initialized, STOP here. Don't run again.
    if (isInitialized.current) return;

    // 3. Initialize the n8n Chat
    createChat({
      webhookUrl: 'https://kasumi.app.n8n.cloud/webhook/bf4a47b3-59ac-4eb3-9774-4c9df7ca3815/chat',
      mode: 'window', 
      showWelcomeScreen: true, 
      initialMessages: [
        'Hi! I am the SakaNect AI. 🤖',
        'I can help you with crop prices and market trends.'
      ],
      i18n: {
        en: {
          title: 'SakaNect AI',
          subtitle: 'Market Intelligence Assistant',
        },
      },
    });

    // 4. Mark as done so it doesn't run a second time
    isInitialized.current = true;
  }, []);

  return null; 
}