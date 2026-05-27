export const initialItems = [
  { id: 1, name: "Tent", category: "Gear", quantity: 5, quantityInUse: 3 },
  {
    id: 2,
    name: "Rope",
    category: "Equipment",
    quantity: 12,
    quantityInUse: 0,
  },
  {
    id: 3,
    name: "Gas Cylinder",
    category: "Cooking",
    quantity: 2,
    quantityInUse: 1,
  },
  {
    id: 4,
    name: "Cooking Pot",
    category: "Cooking",
    quantity: 0,
    quantityInUse: 0,
  },
  {
    id: 5,
    name: "Sleeping Bag",
    category: "Gear",
    quantity: 8,
    quantityInUse: 0,
  },
];

export function getStatus(item) {
  if (item.quantity === 0) return "Out of Stock";
  if (item.quantity <= 3) return "Low Stock";
  return "Available";
}
