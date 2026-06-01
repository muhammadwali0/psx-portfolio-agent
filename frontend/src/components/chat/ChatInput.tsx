import { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/store';

interface Props {
  onSend: (text: string) => void;
  loading: boolean;
}

export default function ChatInput({ onSend, loading }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shariahMode = useStore((s) => s.shariahMode);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setText('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={inputRef}
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Ask about PSX markets…"
        rows={1}
        className="flex-1 resize-none bg-surface-secondary border border-psx-500/10 rounded-xl px-4 py-3 text-[13px] text-psx-50 placeholder:text-psx-300 focus:outline-none focus:ring-1 focus:ring-psx-500/20 transition max-h-[120px]"
        style={{ height: 'auto' }}
      />
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleSend}
        disabled={!text.trim() || loading}
        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
          text.trim() && !loading
            ? shariahMode
              ? 'bg-shariah text-white shadow-sm shadow-shariah/10'
              : 'btn-gold text-surface-primary'
            : 'bg-psx-500/10 text-psx-300'
        }`}
      >
        <Send className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
