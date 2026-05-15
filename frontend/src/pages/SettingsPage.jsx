import GlowCard from '@/components/common/GlowCard';
import GlowButton from '@/components/common/GlowButton';

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl md:text-2xl font-bold text-white">Settings</h1><p className="text-sm text-slate-500 mt-1">Configure your AI agent & preferences</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlowCard>
          <h3 className="text-sm font-semibold text-white mb-4">AI Configuration</h3>
          <div className="space-y-3">
            <div><label className="text-xs text-slate-500">AI Model</label><select className="w-full mt-1 bg-dark-800/60 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neon/30"><option>Gemini 2.5 Pro</option><option>Gemini 2.5 Flash</option></select></div>
            <div><label className="text-xs text-slate-500">Temperature</label><input type="range" min="0" max="100" defaultValue="20" className="w-full mt-1 accent-neon" /><p className="text-xs text-slate-500 mt-1">0.2 — Conservative</p></div>
            <div><label className="text-xs text-slate-500">Default Capital (PKR)</label><input type="number" defaultValue={1000000} className="w-full mt-1 bg-dark-800/60 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-neon/30" /></div>
          </div>
        </GlowCard>
        <GlowCard>
          <h3 className="text-sm font-semibold text-white mb-4">Display</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Dark Mode</span><div className="w-10 h-5 bg-neon/20 rounded-full relative cursor-pointer"><div className="absolute right-0.5 top-0.5 w-4 h-4 bg-neon rounded-full shadow-neon" /></div></div>
            <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Animations</span><div className="w-10 h-5 bg-neon/20 rounded-full relative cursor-pointer"><div className="absolute right-0.5 top-0.5 w-4 h-4 bg-neon rounded-full shadow-neon" /></div></div>
            <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Live Ticker</span><div className="w-10 h-5 bg-neon/20 rounded-full relative cursor-pointer"><div className="absolute right-0.5 top-0.5 w-4 h-4 bg-neon rounded-full shadow-neon" /></div></div>
          </div>
        </GlowCard>
        <GlowCard>
          <h3 className="text-sm font-semibold text-white mb-4">Notifications</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Signal Alerts</span><div className="w-10 h-5 bg-neon/20 rounded-full relative cursor-pointer"><div className="absolute right-0.5 top-0.5 w-4 h-4 bg-neon rounded-full shadow-neon" /></div></div>
            <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Portfolio Updates</span><div className="w-10 h-5 bg-dark-700 rounded-full relative cursor-pointer"><div className="absolute left-0.5 top-0.5 w-4 h-4 bg-slate-500 rounded-full" /></div></div>
          </div>
        </GlowCard>
        <GlowCard>
          <h3 className="text-sm font-semibold text-white mb-4">API Connection</h3>
          <div className="space-y-3">
            <div><label className="text-xs text-slate-500">Backend URL</label><input type="text" defaultValue="http://localhost:8080" className="w-full mt-1 bg-dark-800/60 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-neon/30" /></div>
            <GlowButton variant="secondary" size="sm">Test Connection</GlowButton>
          </div>
        </GlowCard>
      </div>
    </div>
  );
}
