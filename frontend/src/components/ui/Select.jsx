import clsx from 'clsx';

export default function Select({ label, error, options = [], className, ...props }) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <select
        className={clsx(
          'input appearance-none cursor-pointer',
          error && 'border-red-500',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
