import { motion } from 'framer-motion';
import { Bot, User } from 'lucide-react';
import { useStore } from '../../store/store';

interface Props {
  message: { id: string; role: 'user' | 'assistant'; content: string; timestamp: number };
}

export default function ChatBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const shariahMode = useStore((s) => s.shariahMode);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
          isUser
            ? 'bg-psx-800 border-psx-500/10'
            : shariahMode
              ? 'bg-shariah/8 border-shariah/10'
              : 'bg-gold/8 border-gold/10'
        }`}
      >
        {isUser
          ? <User className="w-3.5 h-3.5 text-psx-300" />
          : <Bot className={`w-3.5 h-3.5 ${shariahMode ? 'text-shariah-light' : 'text-gold'}`} />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block px-4 py-3 rounded-2xl text-[13px] leading-relaxed ${
          isUser
            ? 'bg-psx-600 text-psx-50 rounded-tr-md border border-psx-500/20'
            : 'bg-psx-800 text-psx-100 border border-psx-500/10 rounded-tl-md'
        }`}>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <p className="text-[9px] text-psx-500 mt-1 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
}
