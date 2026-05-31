import { ReactNode } from 'react';

interface Props { title: string; children: ReactNode; }

export default function SettingsGroup({ title, children }: Props) {
  return (
    <div>
      <h3 className="text-[10px] font-semibold text-psx-400 uppercase tracking-wider mb-2">{title}</h3>
      <div className="glass-card rounded-2xl px-4">
        {children}
      </div>
    </div>
  );
}
