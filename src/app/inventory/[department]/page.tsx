'use client';

import type { FormEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import {
  departmentCategories,
  getStatus,
  type InventoryCategory,
  type InventoryDepartment,
  type InventoryItem,
} from '@/data/inventory';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type ItemRow = {
  id: number;
  name: string;
  category: string;
  quantity: number;
  quantity_in_use?: number | null;
};

type HistoryRow = {
  id: number;
  item_id: number;
  item_name: string;
  category: string;
  quantity_changed: number;
  action: string;
  user_email: string;
  created_at: string;
};

type ItemUsageRow = {
  id: number;
  item_id: number;
  user_email: string;
  quantity_in_use: number;
};

type InventoryForm = {
  name: string;
  category: InventoryCategory;
  quantity: number | string;
  quantityInUse: number | string;
};

type AmountDrafts = Record<number, number | ''>;
type MyUsageDrafts = Record<number, number | string>;
type UserRole = 'cg' | 'intendant' | 'gerant' | 'viewer';

const PRIVILEGED_ROLES: UserRole[] = ['cg', 'intendant', 'gerant'];

const categoryOptionsByDepartment: Record<InventoryDepartment, InventoryCategory[]> = {
  intendant: ['Cooking'],
  materiel: ['Equipment', 'Stationery'],
};

const departmentLabels: Record<InventoryDepartment, string> = {
  intendant: 'Intendant',
  materiel: 'Gérant de Matériel',
};

const toInventoryItem = (row: ItemRow): InventoryItem => ({
  id: row.id,
  name: row.name,
  category: row.category as InventoryCategory,
  quantity: row.quantity,
  quantityInUse: row.quantity_in_use ?? 0,
});

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const formatUserEmail = (email: string) => {
  const name = email.split('@')[0];
  return name
    .split('.')
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export default function DepartmentInventory() {
  const params = useParams<{ department: string }>();
  const dept = (params?.department ?? 'materiel') as InventoryDepartment;
  const categories = departmentCategories[dept] ?? [];
  const categoryOptions = categoryOptionsByDepartment[dept] ?? [];
  const label = departmentLabels[dept] ?? dept;
  const defaultCategory = categoryOptions[0] ?? 'Gear' as InventoryCategory;

  const emptyForm: InventoryForm = {
    name: '',
    category: defaultCategory,
    quantity: 1,
    quantityInUse: 0,
  };

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<InventoryForm>(emptyForm);
  const [removeAmounts, setRemoveAmounts] = useState<AmountDrafts>({});
  const [removingItemId, setRemovingItemId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('viewer');
  const [myUsage, setMyUsage] = useState<Record<number, number>>({});
  const [myUsageDrafts, setMyUsageDrafts] = useState<MyUsageDrafts>({});
  const [pendingUsage, setPendingUsage] = useState<Record<number, number>>({});

  const isPrivileged = PRIVILEGED_ROLES.includes(userRole);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const email = userData.user?.email ?? '';
        const userId = userData.user?.id ?? '';
        setUserEmail(email);

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('id', userId)
          .single();
        setUserRole((roleData?.role as UserRole) ?? 'viewer');

        const { data: itemData, error: itemError } = await supabase
          .from('items')
          .select('*')
          .in('category', categories)
          .order('id', { ascending: false });

        if (itemError) { setError('Could not load items.'); return; }
        setItems((itemData as ItemRow[]).map(toInventoryItem));

        if (email) {
          const { data: usageData } = await supabase
            .from('item_usage')
            .select('*')
            .eq('user_email', email);

          const usageMap: Record<number, number> = {};
          (usageData as ItemUsageRow[] ?? []).forEach(u => {
            usageMap[u.item_id] = u.quantity_in_use;
          });
          setMyUsage(usageMap);
        }
      } catch {
        setError('Could not connect to Supabase.');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();

    // Realtime subscription
    const channel = supabase
      .channel(`items-${dept}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ItemRow;
            if (categories.includes(updated.category as InventoryCategory)) {
              setItems(prev => prev.map(i =>
                i.id === updated.id ? toInventoryItem(updated) : i
              ));
            }
          }
          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as ItemRow;
            if (categories.includes(inserted.category as InventoryCategory)) {
              setItems(prev => {
                if (prev.some(i => i.id === inserted.id)) return prev;
                return [toInventoryItem(inserted), ...prev];
              });
            }
          }
          if (payload.eventType === 'DELETE') {
            const deleted = payload.old as ItemRow;
            setItems(prev => prev.filter(i => i.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dept]);

  const logHistory = async (item: InventoryItem, action: string, quantityChanged: number) => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: existing } = await supabase
      .from('history')
      .select('*')
      .eq('item_id', item.id)
      .eq('user_email', userEmail)
      .eq('action', action)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    const row = existing?.[0];

    if (row) {
      await supabase
        .from('history')
        .update({
          quantity_changed: row.quantity_changed + quantityChanged,
          created_at: new Date().toISOString(),
        })
        .eq('id', row.id);
    } else {
      await supabase.from('history').insert({
        item_id: item.id,
        item_name: item.name,
        category: item.category,
        quantity_changed: quantityChanged,
        action,
        user_email: userEmail,
      });
    }
  };

  const openHistory = async (item: InventoryItem) => {
    setHistoryItem(item);
    setHistoryLoading(true);
    const { data } = await supabase
      .from('history')
      .select('*')
      .eq('item_id', item.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setHistory((data as HistoryRow[]) ?? []);
    setHistoryLoading(false);
  };

  const closeHistory = () => { setHistoryItem(null); setHistory([]); };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (!confirm(`Delete "${item.name}" completely? This cannot be undone.`)) return;
    const { error } = await supabase.from('items').delete().eq('id', item.id);
    if (!error) {
      setItems(prev => prev.filter(i => i.id !== item.id));
      await supabase.from('item_usage').delete().eq('item_id', item.id);
      await supabase.from('history').delete().eq('item_id', item.id);
    } else {
      setError('Could not delete item.');
    }
  };

  const handleMyUsageDraftChange = (item: InventoryItem, value: string) => {
    if (value !== '' && !Number.isFinite(Number(value))) return;
    setMyUsageDrafts(prev => ({ ...prev, [item.id]: value }));
    const parsed = value === '' ? 0 : Number(value);
    if (isFinite(parsed)) {
      const current = myUsage[item.id] ?? 0;
      const othersInUse = item.quantityInUse - current;
      const maxAllowed = item.quantity - othersInUse;
      const clamped = Math.min(Math.max(parsed, 0), maxAllowed);
      setPendingUsage(prev => ({ ...prev, [item.id]: clamped }));
    }
  };

  const adjustMyUsageDraft = (item: InventoryItem, dir: number) => {
    const current = myUsage[item.id] ?? 0;
    const othersInUse = item.quantityInUse - current;
    const maxAllowed = item.quantity - othersInUse;
    const currentDraft = pendingUsage[item.id] ?? current;
    const newVal = Math.min(Math.max(currentDraft + dir, 0), maxAllowed);
    setPendingUsage(prev => ({ ...prev, [item.id]: newVal }));
    setMyUsageDrafts(prev => ({ ...prev, [item.id]: newVal }));
  };

  const confirmMyUsage = async (item: InventoryItem) => {
    const newMyQty = pendingUsage[item.id];
    if (newMyQty === undefined) return;

    const oldMyQty = myUsage[item.id] ?? 0;
    const diff = newMyQty - oldMyQty;

    if (diff === 0) {
      setPendingUsage(prev => { const n = { ...prev }; delete n[item.id]; return n; });
      setMyUsageDrafts(prev => { const n = { ...prev }; delete n[item.id]; return n; });
      return;
    }

    const othersInUse = item.quantityInUse - oldMyQty;
    const newTotal = othersInUse + newMyQty;
    if (newTotal > item.quantity) return;

    const newQuantity = item.quantity - newMyQty;
    const newQuantityInUse = othersInUse;

    await supabase.from('item_usage').upsert({
      item_id: item.id,
      user_email: userEmail,
      quantity_in_use: 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'item_id,user_email' });

    const { data } = await supabase
      .from('items')
      .update({ quantity: newQuantity, quantity_in_use: newQuantityInUse })
      .eq('id', item.id)
      .select()
      .single();

    if (data) {
      setItems(prev => prev.map(i => i.id === item.id ? toInventoryItem(data as ItemRow) : i));
    }

    setMyUsage(prev => ({ ...prev, [item.id]: 0 }));
    setPendingUsage(prev => { const n = { ...prev }; delete n[item.id]; return n; });
    setMyUsageDrafts(prev => { const n = { ...prev }; delete n[item.id]; return n; });
    await logHistory(item, 'Checked out', newMyQty);
  };

  const cancelMyUsage = (item: InventoryItem) => {
    setPendingUsage(prev => { const n = { ...prev }; delete n[item.id]; return n; });
    setMyUsageDrafts(prev => { const n = { ...prev }; delete n[item.id]; return n; });
  };

  const hasPendingUsage = (item: InventoryItem) =>
    pendingUsage[item.id] !== undefined &&
    pendingUsage[item.id] !== (myUsage[item.id] ?? 0);

  const filteredItems = useMemo(() =>
    items.filter(item => {
      const matchCat = filterCategory ? item.category === filterCategory : true;
      const matchSearch = search ? item.name.toLowerCase().includes(search.toLowerCase()) : true;
      const matchStatus = filterStatus ? getStatus(item) === filterStatus : true;
      return matchCat && matchSearch && matchStatus;
    }),
    [items, filterCategory, search, filterStatus],
  );

  const itemSuggestions = useMemo(
    () => [...new Set(items.map(i => i.name))].sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const matchingItem = useMemo(
    () => items.find(i =>
      i.name.toLowerCase() === form.name.trim().toLowerCase() &&
      i.category.toLowerCase() === form.category.toLowerCase()
    ),
    [form.name, form.category, items],
  );

  const visibleSuggestions = useMemo(() => {
    const query = form.name.trim().toLowerCase();
    if (!query) return [];
    return itemSuggestions
      .filter(name => name.toLowerCase().includes(query))
      .slice(0, 5);
  }, [form.name, itemSuggestions]);

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextName = e.target.value;
    const suggested = items.find(i => i.name.toLowerCase() === nextName.trim().toLowerCase());
    setForm(prev => ({
      ...prev,
      name: nextName,
      category: suggested ? suggested.category : prev.category,
    }));
  };

  const selectSuggestion = (itemName: string) => {
    const suggested = items.find(i => i.name.toLowerCase() === itemName.toLowerCase());
    setForm(prev => ({
      ...prev,
      name: itemName,
      category: suggested ? suggested.category : prev.category,
    }));
  };

  const adjustFormField = (field: 'quantity' | 'quantityInUse', dir: number, min: number, max: number) => {
    setForm(prev => ({ ...prev, [field]: Math.min(Math.max(Number(prev[field]) + dir, min), max) }));
  };

  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault();
    const itemName = form.name.trim();
    const quantity = Number(form.quantity);
    if (!itemName || quantity < 1) return;

    const existing = items.find(i =>
      i.name.toLowerCase() === itemName.toLowerCase() &&
      i.category.toLowerCase() === form.category.toLowerCase()
    );

    if (existing) {
      const { data, error } = await supabase
        .from('items')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id).select().single();
      if (!error && data) {
        const updated = toInventoryItem(data as ItemRow);
        setItems(prev => prev.map(i => i.id === existing.id ? updated : i));
        await logHistory(updated, 'Added quantity', quantity);
      } else { setError('Could not update item.'); return; }
    } else {
      const { data, error } = await supabase
        .from('items')
        .insert({ name: itemName, category: form.category, quantity, quantity_in_use: 0 })
        .select().single();
      if (!error && data) {
        const newItem = toInventoryItem(data as ItemRow);
        setItems(prev => [newItem, ...prev]);
        await logHistory(newItem, 'Item created', quantity);
      } else { setError('Could not save item.'); return; }
    }

    setForm(emptyForm);
    setIsAdding(false);
  };

  const startRemoving = (id: number) => {
    setRemoveAmounts(prev => ({ ...prev, [id]: 1 }));
    setRemovingItemId(id);
  };
  const cancelRemoving = () => setRemovingItemId(null);

  const adjustRemove = (item: InventoryItem, dir: number) => {
    setRemoveAmounts(prev => ({
      ...prev,
      [item.id]: Math.min(Math.max(Number(prev[item.id] || 1) + dir, 1), item.quantity),
    }));
  };

  const getRemoveAmt = (item: InventoryItem) => {
    const n = Number(removeAmounts[item.id] || 1);
    return Math.min(isFinite(n) && n >= 1 ? n : 1, Math.max(item.quantity, 1));
  };

  const handleRemove = async (item: InventoryItem) => {
    const amt = getRemoveAmt(item);
    const newQty = item.quantity - amt;
    const newInUse = Math.min(item.quantityInUse, newQty);
    const { data, error } = await supabase
      .from('items')
      .update({ quantity: newQty, quantity_in_use: newInUse })
      .eq('id', item.id).select().single();
    if (!error && data) {
      const updated = toInventoryItem(data as ItemRow);
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
      await logHistory(updated, 'Removed quantity', amt);
    }
    setRemovingItemId(null);
  };

  const renderMyUsageControls = (item: InventoryItem): ReactNode => {
    const current = myUsage[item.id] ?? 0;
    const othersInUse = item.quantityInUse - current;
    const maxAllowed = item.quantity - othersInUse;
    const displayVal = myUsageDrafts[item.id] ?? current;
    const isPending = hasPendingUsage(item);

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <div className="stepper">
          <button
            className="stepper-button"
            type="button"
            disabled={(pendingUsage[item.id] ?? current) <= 0}
            onClick={() => adjustMyUsageDraft(item, -1)}
          >-</button>
          <input
            className="stepper-input"
            type="number"
            min="0"
            max={maxAllowed}
            value={displayVal}
            onChange={e => handleMyUsageDraftChange(item, e.target.value)}
          />
          <button
            className="stepper-button"
            type="button"
            disabled={(pendingUsage[item.id] ?? current) >= maxAllowed}
            onClick={() => adjustMyUsageDraft(item, 1)}
          >+</button>
        </div>
        {isPending && (
          <>
            <button
              className="table-action"
              type="button"
              onClick={() => confirmMyUsage(item)}
              style={{ fontSize: '12px', padding: '4px 8px' }}
            >Done</button>
            <button
              className="table-action table-action--muted"
              type="button"
              onClick={() => cancelMyUsage(item)}
              style={{ fontSize: '12px', padding: '4px 8px' }}
            >Cancel</button>
          </>
        )}
      </div>
    );
  };

  const renderRemoveControls = (item: InventoryItem): ReactNode => (
    <div className="remove-confirm">
      <div className="stepper">
        <button className="stepper-button" type="button" disabled={getRemoveAmt(item) <= 1} onClick={() => adjustRemove(item, -1)}>-</button>
        <input
          className="stepper-input"
          type="number" min="1" max={item.quantity}
          value={removeAmounts[item.id] ?? 1}
          onChange={e => setRemoveAmounts(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
        />
        <button className="stepper-button" type="button" disabled={getRemoveAmt(item) >= item.quantity} onClick={() => adjustRemove(item, 1)}>+</button>
      </div>
      <button className="table-action" type="button" onClick={() => handleRemove(item)}>Confirm</button>
      <button className="table-action table-action--muted" type="button" onClick={cancelRemoving}>Cancel</button>
    </div>
  );

  const renderActions = (item: InventoryItem): ReactNode => {
    if (removingItemId === item.id) return renderRemoveControls(item);
    return (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        {isPrivileged && item.quantity > 0 && (
          <button className="table-action" type="button" onClick={() => startRemoving(item.id)}>Remove</button>
        )}
        {item.quantity <= 0 && (
          <span className="table-action-status">No stock</span>
        )}
        {isPrivileged && (
          <>
            <button className="table-action table-action--history" type="button" onClick={() => openHistory(item)}>History</button>
            <button className="table-action table-action--delete" type="button" onClick={() => handleDeleteItem(item)}>Delete</button>
          </>
        )}
      </div>
    );
  };

  if (loading) return (
    <main className="page-shell">
      <p style={{ textAlign: 'center', color: '#888', padding: '40px' }}>Loading inventory...</p>
    </main>
  );

  return (
    <main className="page-shell">

      {historyItem && (
        <div className="history-overlay" onClick={closeHistory}>
          <div className="history-modal" onClick={e => e.stopPropagation()}>
            <div className="history-modal__header">
              <div>
                <p className="eyebrow">History</p>
                <h2>{historyItem.name}</h2>
              </div>
              <button className="history-close" type="button" onClick={closeHistory}>✕</button>
            </div>
            <div className="history-modal__body">
              {historyLoading ? (
                <p className="history-empty">Loading...</p>
              ) : history.length === 0 ? (
                <p className="history-empty">No history yet for this item.</p>
              ) : (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Action</th>
                      <th>Qty</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(row => (
                      <tr key={row.id}>
                        <td>{formatUserEmail(row.user_email)}</td>
                        <td>
                          <span className={`history-action history-action--${
                            row.action === 'Removed quantity' || row.action === 'Returned from use' || row.action === 'Checked out' ? 'out' :
                            row.action === 'Marked in use' ? 'use' : 'in'
                          }`}>
                            {row.action}
                          </span>
                        </td>
                        <td><strong>{row.quantity_changed}</strong></td>
                        <td>{formatDate(row.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="section-header section-header--wrap">
        <h1>{label}</h1>
        <div className="toolbar">
          <input
            className="search-input"
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {categoryOptions.length > 1 && (
            <select className="select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categoryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          )}
          <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="Available">Available</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
          <button className="button button--primary" type="button" onClick={() => setIsAdding(v => !v)}>
            {isAdding ? 'Close' : 'Add Item'}
          </button>
        </div>
      </div>

      {error && (
        <section className="panel accent-red" role="alert" style={{ padding: '12px 16px', marginBottom: '16px' }}>
          <p>{error}</p>
        </section>
      )}

      {isAdding && (
        <section className="panel inventory-form-panel accent-green" aria-label="Add inventory item">
          <form className="inventory-form" onSubmit={handleAddItem}>
            <label>
              Item name
              <div className="suggestion-field">
                <input
                  autoComplete="off"
                  name="name"
                  type="text"
                  placeholder="Example: First Aid Kit"
                  value={form.name}
                  onChange={handleNameChange}
                />
                {!matchingItem && visibleSuggestions.length > 0 && (
                  <div className="suggestion-menu">
                    {visibleSuggestions.map(itemName => {
                      const suggested = items.find(i => i.name === itemName);
                      return (
                        <button
                          className="suggestion-option"
                          key={itemName}
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => selectSuggestion(itemName)}
                        >
                          <span>{itemName}</span>
                          {suggested && <small>{suggested.category} · Qty {suggested.quantity}</small>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </label>

            {matchingItem ? (
              <div className="locked-category">
                <span>Category</span>
                <strong>{matchingItem.category}</strong>
              </div>
            ) : categoryOptions.length > 1 ? (
              <label>
                Category
                <select className="select" name="category" value={form.category} onChange={handleFieldChange}>
                  {categoryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </label>
            ) : (
              <div className="locked-category">
                <span>Category</span>
                <strong>{defaultCategory}</strong>
              </div>
            )}

            <label>
              Quantity
              <div className="stepper">
                <button className="stepper-button" type="button" disabled={Number(form.quantity) <= 1} onClick={() => adjustFormField('quantity', -1, 1, 9999)}>-</button>
                <input className="stepper-input" type="number" min="1" name="quantity" value={form.quantity} onChange={handleFieldChange} />
                <button className="stepper-button" type="button" onClick={() => adjustFormField('quantity', 1, 1, 9999)}>+</button>
              </div>
            </label>

            <button className="button button--primary" type="submit">
              {matchingItem ? 'Add Quantity' : 'Save Item'}
            </button>
          </form>
          {matchingItem && (
            <p className="inventory-form-note">
              {matchingItem.name} already exists in {matchingItem.category}. Saving will add to its current quantity of {matchingItem.quantity}.
            </p>
          )}
        </section>
      )}

      <section className="panel table-panel accent-red" aria-label="Inventory items">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>My In Use</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length ? filteredItems.map(item => (
                <tr key={item.id}>
                  <td className="item-name">{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.quantity}</td>
                  <td>{renderMyUsageControls(item)}</td>
                  <td><StatusBadge item={item} /></td>
                  <td>{renderActions(item)}</td>
                </tr>
              )) : (
                <tr><td className="empty-state" colSpan={6}>No items to show.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mobile-cards" aria-label="Inventory items mobile">
        {filteredItems.length ? filteredItems.map(item => (
          <article className="inventory-card panel accent-red" key={item.id}>
            <div className="inventory-card__header">
              <span className="item-name">{item.name}</span>
              <StatusBadge item={item} />
            </div>
            <div className="inventory-card__body">
              <div className="inventory-card__row">
                <span className="eyebrow">Category</span>
                <span>{item.category}</span>
              </div>
              <div className="inventory-card__row">
                <span className="eyebrow">Quantity</span>
                <span>{item.quantity}</span>
              </div>
              <div className="inventory-card__row">
                <span className="eyebrow">My In Use</span>
                {renderMyUsageControls(item)}
              </div>
            </div>
            <div className="inventory-card__footer" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {renderActions(item)}
            </div>
          </article>
        )) : (
          <p className="empty-state">No items to show.</p>
        )}
      </section>

    </main>
  );
}