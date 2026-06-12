import { getStatus, type InventoryItem } from '@/data/inventory';

const statusClassNames = {
  Available: 'status-badge status-badge--available',
  'Low Stock': 'status-badge status-badge--low',
  'Out of Stock': 'status-badge status-badge--out',
} satisfies Record<ReturnType<typeof getStatus>, string>;

type StatusBadgeProps = {
  item: InventoryItem;
};

export default function StatusBadge({ item }: StatusBadgeProps) {
  const status = getStatus(item);

  return <span className={statusClassNames[status]}>{status}</span>;
}
