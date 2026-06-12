export type InventoryCategory = 'Cooking'| 'Equipment' | 'Stationery';

export type InventoryDepartment = 'intendant' | 'materiel';

export const departmentCategories: Record<InventoryDepartment, InventoryCategory[]> = {
  intendant: ['Cooking'],
  materiel: ['Equipment','Stationery'],
};

export type InventoryItem = {
  id: number;
  name: string;
  category: InventoryCategory;
  quantity: number;
  quantityInUse: number;
};

export type InventoryStatus = 'Available' | 'Low Stock' | 'Out of Stock';

export function getStatus(item: InventoryItem): InventoryStatus {
  if (item.quantity === 0) return 'Out of Stock';
  if (item.quantity <= 3) return 'Low Stock';
  return 'Available';
}