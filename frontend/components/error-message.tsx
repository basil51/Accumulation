interface ErrorMessageProps {
  message: string;
  className?: string;
  onDismiss?: () => void;
}

export function ErrorMessage({
  message,
  className = '',
  onDismiss,
}: ErrorMessageProps) {
  return (
    <div
      className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm ${className}`}
      role="alert"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <strong className="font-medium">Error:</strong> {message}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

