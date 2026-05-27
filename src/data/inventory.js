export function getStatus(item) {
  if (item.quantity === 0) return "Out of Stock";
  if (item.quantity <= 3) return "Low Stock";
  return "Available";
}
