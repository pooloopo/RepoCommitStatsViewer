export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-accent border-t-primary rounded-full animate-spin" />
    </div>
  );
}
