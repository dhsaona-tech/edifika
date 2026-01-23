import LoadingSpinner from "./LoadingSpinner";

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingState({
  message = "Cargando...",
  fullScreen = false,
}: LoadingStateProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm font-medium text-gray-600">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-sm font-medium text-gray-600">{message}</p>
    </div>
  );
}
