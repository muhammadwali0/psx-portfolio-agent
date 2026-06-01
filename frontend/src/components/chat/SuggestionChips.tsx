import { useStore } from '../../store/store';
import { defaultSuggestions, shariahSuggestions } from '../../design/shariahTheme';

interface Props {
  onSelect: (text: string) => void;
  compact?: boolean;
}

export default function SuggestionChips({ onSelect, compact = false }: Props) {
  const shariahMode = useStore((s) => s.shariahMode);
  const suggestions = shariahMode ? shariahSuggestions : defaultSuggestions;

  return (
    <div className={`flex gap-2 overflow-x-auto no-scrollbar ${compact ? 'pb-2' : 'pb-0'}`}>
      {suggestions.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className={`shrink-0 px-3 rounded-xl border border-psx-500/10 bg-psx-800 text-psx-300 hover:bg-psx-600 hover:text-psx-200 transition-colors font-medium whitespace-nowrap ${compact ? 'py-1.5 text-[10px]' : 'py-2 text-[11px]'}`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
