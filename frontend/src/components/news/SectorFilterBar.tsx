interface Props {
  tickers: string[];
  selected: string | null;
  onSelect: (t: string | null) => void;
}

export default function SectorFilterBar({ tickers, selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 py-3 border-b border-psx-500/10">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${!selected ? 'bg-psx-600 text-psx-50 border border-psx-500/20' : 'text-psx-300 bg-psx-800 border border-psx-500/10 hover:bg-psx-700/50'}`}
      >
        All
      </button>
      {tickers.map((t) => (
        <button
          key={t}
          onClick={() => onSelect(selected === t ? null : t)}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${selected === t ? 'bg-psx-600 text-psx-50 border border-psx-500/20' : 'text-psx-300 bg-psx-800 border border-psx-500/10 hover:bg-psx-700/50'}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
