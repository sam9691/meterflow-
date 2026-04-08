import clsx from 'clsx';

const variants = {
  green: 'badge-green',
  red: 'badge-red',
  yellow: 'badge-yellow',
  blue: 'badge-blue',
  gray: 'badge-gray',
};

export default function Badge({ children, variant = 'gray', className }) {
  return (
    <span className={clsx('badge', variants[variant], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    active: { variant: 'green', label: 'Active' },
    inactive: { variant: 'gray', label: 'Inactive' },
    revoked: { variant: 'red', label: 'Revoked' },
    expired: { variant: 'yellow', label: 'Expired' },
    deprecated: { variant: 'yellow', label: 'Deprecated' },
    paid: { variant: 'green', label: 'Paid' },
    open: { variant: 'blue', label: 'Open' },
    pending: { variant: 'yellow', label: 'Pending' },
    failed: { variant: 'red', label: 'Failed' },
  };
  const config = map[status] || { variant: 'gray', label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function PlanBadge({ plan }) {
  const map = {
    free: { variant: 'gray', label: 'Free' },
    pro: { variant: 'blue', label: 'Pro' },
    enterprise: { variant: 'yellow', label: 'Enterprise' },
  };
  const config = map[plan] || { variant: 'gray', label: plan };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
