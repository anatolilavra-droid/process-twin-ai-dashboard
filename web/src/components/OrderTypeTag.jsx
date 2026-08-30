import { BoltIcon, CircleDotIcon, ShieldIcon, StarIcon } from './icons';

const ORDER_TYPE_META = {
  standard: { label: 'Standard', Icon: CircleDotIcon },
  urgent: { label: 'Urgent', Icon: BoltIcon },
  premium: { label: 'Premium', Icon: StarIcon },
  warranty: { label: 'Warranty', Icon: ShieldIcon },
};

function OrderTypeTag({ orderType }) {
  const { label, Icon } = ORDER_TYPE_META[orderType] || { label: orderType, Icon: CircleDotIcon };
  return (
    <span className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-xs text-ink-muted">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export default OrderTypeTag;
