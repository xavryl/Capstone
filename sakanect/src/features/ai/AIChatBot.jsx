import { useEffect } from 'react';
import { createChat } from '@n8n/chat';
import '@n8n/chat/dist/style.css'; // Import default styles
import './ai-chat.css'; // Import our custom overrides

export default function AIChatBot() {
  useEffect(() => {
    // Initialize the n8n Chat
    createChat({
      webhookUrl: 'https://kasumi.app.n8n.cloud/webhook/bf4a47b3-59ac-4eb3-9774-4c9df7ca3815/chat',
      mode: 'window', // 'window' makes it a pop-up chat bubble
      target: '#n8n-chat', // We will attach it to a specific div
      showWelcomeScreen: true, 
      initialMessages: [
        'Hello! I am the SakaNect AI Assistant. 🌱',
        'Ask me about crop prices, farming tips, or market trends!'
      ],
      i18n: {
        en: {
          title: 'SakaNect AI',
          subtitle: 'Ask me anything about agriculture',
        },
      },
    });
  }, []);

  // We render a div that the n8n script will attach to
  return <div id="n8n-chat"></div>;
}