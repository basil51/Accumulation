interface SuccessMessageProps {
  message: string;
  className?: string;
  onDismiss?: () => void;
}

export function SuccessMessage({
  message,
  className = '',
  onDismiss,
}: SuccessMessageProps) {
  return (
    <div
      className={`bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-green-700 dark:text-green-400 text-sm ${className}`}
      role="alert"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <strong className="font-medium">Success:</strong> {message}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
            aria-label="Dismiss message"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

