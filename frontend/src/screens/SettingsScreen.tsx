import { motion } from 'framer-motion';
import { useStore } from '../store/store';
import SettingsToggle from '../components/settings/SettingsToggle';
import SettingsGroup from '../components/settings/SettingsGroup';
import type { RiskLevel, InvestmentMode } from '../api/types';
import { Moon, Sun } from 'lucide-react';

export default function SettingsScreen() {
  const {
    shariahMode, toggleShariah,
    riskDefault, setRiskDefault,
    modeDefault, setModeDefault,
    capitalDefault, setCapitalDefault,
    theme, toggleTheme,
  } = useStore();

  return (
    <div className="section-px py-5 pb-12 space-y-6">
      {/* Shariah Mode — Flagship */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <SettingsGroup title="Islamic Finance">
          <SettingsToggle
            label="Shariah Mode"
            description="Filter for Shariah-compliant investments with Islamic finance principles"
            value={shariahMode}
            onToggle={toggleShariah}
            accentColor="shariah"
          />
        </SettingsGroup>
      </motion.div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.075 }}
      >
        <SettingsGroup title="Appearance">
          <button onClick={toggleTheme} className="w-full flex items-center justify-between py-4 text-left">
            <div className="flex-1 min-w-0 mr-4">
              <p className="text-[13px] font-semibold text-psx-100">Theme</p>
              <p className="text-[10px] text-psx-400 mt-0.5 leading-relaxed">
                Switch between dark and light modes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-psx-300 uppercase">
                {theme === 'dark' ? 'Dark' : 'Light'}
              </span>
              <div className="w-9 h-9 rounded-xl bg-psx-850 border border-psx-500/10 flex items-center justify-center">
                {theme === 'dark'
                  ? <Moon className="w-4 h-4 text-psx-200" />
                  : <Sun className="w-4 h-4 text-gold" />
                }
              </div>
            </div>
          </button>
        </SettingsGroup>
      </motion.div>

      {/* Investment Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <SettingsGroup title="Investment Defaults">
          {/* Risk */}
          <div className="py-3">
            <p className="text-[12px] font-semibold text-psx-100 mb-1">Default Risk Level</p>
            <div className="flex gap-2 mt-2">
              {(['low', 'medium', 'high'] as RiskLevel[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRiskDefault(r)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-semibold capitalize transition-all duration-200 ${riskDefault === r ? 'bg-psx-600 text-psx-50 border border-psx-500/20 shadow-sm' : 'bg-psx-800 text-psx-300 border border-psx-500/10 hover:bg-psx-700/50'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-psx-500/10" />

          {/* Mode */}
          <div className="py-3">
            <p className="text-[12px] font-semibold text-psx-100 mb-1">Investment Mode</p>
            <div className="flex gap-2 mt-2">
              {(['fundamental', 'tactical'] as InvestmentMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setModeDefault(m)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-semibold capitalize transition-all duration-200 ${modeDefault === m ? 'bg-psx-600 text-psx-50 border border-psx-500/20 shadow-sm' : 'bg-psx-800 text-psx-300 border border-psx-500/10 hover:bg-psx-700/50'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-psx-500/10" />

          {/* Capital */}
          <div className="py-3">
            <p className="text-[12px] font-semibold text-psx-100 mb-1">Default Capital (PKR)</p>
            <div className="flex gap-2 mt-2">
              {[500000, 1000000, 5000000, 10000000].map((c) => (
                <button
                  key={c}
                  onClick={() => setCapitalDefault(c)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-semibold transition-all duration-200 ${capitalDefault === c ? 'bg-psx-600 text-psx-50 border border-psx-500/20 shadow-sm' : 'bg-psx-800 text-psx-300 border border-psx-500/10 hover:bg-psx-700/50'}`}
                >
                  {c >= 1000000 ? `${c / 1000000}M` : `${c / 1000}K`}
                </button>
              ))}
            </div>
          </div>
        </SettingsGroup>
      </motion.div>

      {/* About */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <SettingsGroup title="About">
          <div className="py-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-[11px] text-psx-300">Version</span>
              <span className="text-[11px] font-financial text-psx-200">2.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-psx-300">Backend</span>
              <span className="text-[11px] font-financial text-psx-200">FastAPI + Gemini</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-psx-300">Data Source</span>
              <span className="text-[11px] font-financial text-psx-200">PSX Live</span>
            </div>
          </div>
          <div className="py-3 border-t border-psx-500/10">
            <p className="text-[10px] text-psx-400 leading-relaxed">
              AI-powered portfolio intelligence for Pakistan Stock Exchange. Built for AISeekho 2026 — Google Antigravity Hackathon.
            </p>
          </div>
        </SettingsGroup>
      </motion.div>
    </div>
  );
}
