import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/store';
import { sendMessage } from '../api/chat';
import { extractError } from '../api/api';
import ChatBubble from '../components/chat/ChatBubble';
import TypingIndicator from '../components/chat/TypingIndicator';
import SuggestionChips from '../components/chat/SuggestionChips';
import ChatInput from '../components/chat/ChatInput';
import EmptyState from '../components/shared/EmptyState';
import { MessageSquare } from 'lucide-react';

export default function ChatScreen() {
  const { messages, chatLoading, addMessage, setChatLoading, shariahMode } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages.length, chatLoading, scrollToBottom]);

  const handleSend = useCallback(async (text: string) => {
    const userMsg = { id: `u-${Date.now()}`, role: 'user' as const, content: text, timestamp: Date.now() };
    addMessage(userMsg);
    setError('');
    setChatLoading(true);

    try {
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const reply = await sendMessage(text, history, shariahMode);
      addMessage({ id: `a-${Date.now()}`, role: 'assistant', content: reply, timestamp: Date.now() });
    } catch (err) {
      setError(extractError(err));
      addMessage({ id: `e-${Date.now()}`, role: 'assistant', content: 'I apologize, but I\'m unable to respond right now. Please try again.', timestamp: Date.now() });
    } finally {
      setChatLoading(false);
    }
  }, [messages, shariahMode, addMessage, setChatLoading]);

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)]">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6">
            <EmptyState
              title="Ask anything about PSX"
              message="Get AI-powered insights about Pakistan Stock Exchange"
              icon={<MessageSquare className="w-6 h-6 text-psx-300" />}
            />
            <div className="mt-4 w-full max-w-sm">
              <SuggestionChips onSelect={handleSend} />
            </div>
          </div>
        ) : (
          <div className="section-px py-4 space-y-3">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            <AnimatePresence>
              {chatLoading && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <TypingIndicator />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Suggestions (when there are messages) */}
      {messages.length > 0 && !chatLoading && (
        <div className="px-5 pb-1">
          <SuggestionChips onSelect={handleSend} compact />
        </div>
      )}

      {/* Input */}
      <div className="section-px py-3 border-t border-psx-500/10 bg-surface-primary/80 backdrop-blur-xl safe-bottom">
        <ChatInput onSend={handleSend} loading={chatLoading} />
      </div>
    </div>
  );
}
