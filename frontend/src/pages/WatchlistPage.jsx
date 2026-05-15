import WatchlistTable from '@/components/watchlist/WatchlistTable';

export default function WatchlistPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Watchlist</h1>
        <p className="text-sm text-slate-500 mt-1">Track your favorite PSX stocks</p>
      </div>
      <WatchlistTable />
    </div>
  );
}
