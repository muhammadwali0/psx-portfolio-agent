import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPaperAirplane } from 'react-icons/hi';
import GlowCard from '@/components/common/GlowCard';
import LiveDot from '@/components/common/LiveDot';

const initialMessages = [
  { role: 'ai', text: 'Assalam-o-Alaikum! I\'m your PSX AI Portfolio Agent. Ask me about market analysis, stock recommendations, or portfolio optimization.' },
];

const aiResponses = [
  'Banking sector shows strong momentum. HBL and UBL are attractive given the current interest rate environment.',
  'Bullish on ENGRO — strong quarterly earnings and diversified business segments reduce downside risk. Confidence: 87%.',
  'KSE-100 target: 115,000 over next 4 weeks with confidence band of ±2,500 points.',
  'For diversification, allocate 15-20% to technology. SYS offers best risk-adjusted returns.',
  'Risk Alert: Cement sector headwinds from coal prices. Consider reducing LUCK by 5%.',
];

export default function AIChatPanel() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    setInput('');
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', text: aiResponses[Math.floor(Math.random() * aiResponses.length)] }]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1500);
  };

  return (
    <GlowCard className="flex flex-col h-[500px] md:h-[600px] !p-0 overflow-hidden" glowColor="purple">
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon flex items-center justify-center text-sm">🧠</div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
          <div className="flex items-center gap-1.5">
            <LiveDot color="neon" size="xs" />
            <span className="text-[10px] text-slate-500">Active • Gemini 2.5 Pro</span>
          </div>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-neon/10 text-white border border-neon/20 rounded-br-md' : 'bg-dark-800/80 text-slate-300 border border-white/5 rounded-bl-md'}`}>{msg.text}</div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-slate-500 text-xs">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            AI is thinking...
          </motion.div>
        )}
      </div>
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask about stocks, signals..." className="flex-1 bg-dark-800/60 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-neon-purple/30 transition-colors" />
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSend} className="p-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon text-dark-950">
            <HiPaperAirplane className="w-4 h-4 rotate-90" />
          </motion.button>
        </div>
      </div>
    </GlowCard>
  );
}
