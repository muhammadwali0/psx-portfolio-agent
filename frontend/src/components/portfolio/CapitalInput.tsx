import { useState } from 'react';

interface Props { value: number; onChange: (v: number) => void; }

const PRESETS = [500_000, 1_000_000, 5_000_000, 10_000_000];

export default function CapitalInput({ value, onChange }: Props) {
  const [display, setDisplay] = useState(value ? value.toLocaleString('en-PK') : '');
  const [error, setError] = useState('');

  const fmt = (raw: string) => {
    const n = raw.replace(/\D/g, '');
    return n ? Number(n).toLocaleString('en-PK') : '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = fmt(e.target.value);
    setDisplay(formatted);
    const num = Number(e.target.value.replace(/\D/g, ''));
    onChange(num);
    if (num > 0 && num < 10000) setError('Minimum PKR 10,000');
    else if (num > 100_000_000) setError('Maximum PKR 100,000,000');
    else setError('');
  };

  return (
    <div>
      <label className="block text-[10px] font-semibold text-psx-300 uppercase tracking-wider mb-2">
        Investment Capital
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-psx-400">PKR</span>
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          placeholder="1,000,000"
          className={`w-full pl-12 pr-4 py-3.5 rounded-xl bg-surface-secondary border text-base font-financial font-semibold text-psx-50 placeholder:text-psx-400 focus:outline-none focus:ring-1 focus:ring-psx-500/20 transition ${error ? 'border-loss/40' : 'border-psx-500/10'}`}
        />
      </div>
      {error && <p className="mt-1 text-[10px] text-loss font-medium">{error}</p>}
      
      <div className="flex gap-2 mt-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => { onChange(p); setDisplay(p.toLocaleString('en-PK')); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-[10px] font-semibold transition-colors ${value === p ? 'bg-psx-600 text-psx-50 border border-psx-500/20' : 'bg-psx-800 text-psx-300 border border-psx-500/10 hover:bg-psx-700/50'}`}
          >
            {p >= 1_000_000 ? `${p / 1_000_000}M` : `${p / 1_000}K`}
          </button>
        ))}
      </div>
    </div>
  );
}
