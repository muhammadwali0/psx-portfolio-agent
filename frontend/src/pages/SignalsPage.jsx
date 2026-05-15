import SignalsList from '@/components/signals/SignalsList';

export default function SignalsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">AI Signals</h1>
        <p className="text-sm text-slate-500 mt-1">AI-generated trading signals with confidence scores</p>
      </div>
      <SignalsList />
    </div>
  );
}
