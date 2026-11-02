export default function GlobalLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="min-h-screen w-full bg-brand-bg flex items-center justify-center"
    >
      <div className="w-7 h-7 rounded-full border-2 border-gray-200 border-t-brand-violet animate-spin" />
    </div>
  );
}
