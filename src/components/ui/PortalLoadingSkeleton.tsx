export default function PortalLoadingSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="w-full min-h-[60vh] flex items-center justify-center"
    >
      <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-brand-violet animate-spin" />
    </div>
  );
}
