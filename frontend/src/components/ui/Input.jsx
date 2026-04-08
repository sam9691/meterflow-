import clsx from 'clsx';

export default function Input({
  label,
  error,
  hint,
  icon: Icon,
  className,
  ...props
}) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="w-4 h-4 text-dark-400" />
          </div>
        )}
        <input
          className={clsx(
            'input',
            Icon && 'pl-10',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-dark-400">{hint}</p>}
    </div>
  );
}
