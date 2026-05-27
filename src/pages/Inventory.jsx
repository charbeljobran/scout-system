import React, { useMemo, useState } from 'react';
import StatusBadge from '../components/StatusBadge.jsx';
import { getStatus, initialItems } from '../data/inventory.js';

const categoryOptions = ['Gear', 'Equipment', 'Cooking'];
const emptyForm = {
  name: '',
  category: 'Gear',
  quantity: 1,
  quantityInUse: 0,
};

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState(initialItems);
  const [category, setCategory] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [removeAmounts, setRemoveAmounts] = useState({});
  const [removingItemId, setRemovingItemId] = useState(null);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const matchCategory = category ? item.category === category : true;
        const matchSearch = search ? item.name.toLowerCase().includes(search.toLowerCase()) : true;
        return matchCategory && matchSearch;
      }),
    [category, search, items],
  );

  const stats = useMemo(
    () => [
      { label: 'Available', value: items.filter((item) => getStatus(item) === 'Available').length, tone: 'green' },
      { label: 'In Use', value: items.filter((item) => item.quantityInUse > 0).length, tone: 'gold' },
      { label: 'Low Stock', value: items.filter((item) => getStatus(item) === 'Low Stock').length, tone: 'orange' },
      { label: 'Out of Stock', value: items.filter((item) => getStatus(item) === 'Out of Stock').length, tone: 'red' },
    ],
    [items],
  );

  const itemSuggestions = useMemo(
    () => [...new Set(items.map((item) => item.name))].sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const matchingItem = useMemo(
    () =>
      items.find(
        (item) =>
          item.name.toLowerCase() === form.name.trim().toLowerCase() &&
          item.category.toLowerCase() === form.category.toLowerCase(),
      ),
    [form.category, form.name, items],
  );

  const visibleSuggestions = useMemo(() => {
    const query = form.name.trim().toLowerCase();
    return itemSuggestions
      .filter((itemName) => !query || itemName.toLowerCase().includes(query))
      .slice(0, 5);
  }, [form.name, itemSuggestions]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleNameChange = (event) => {
    const nextName = event.target.value;
    const suggestedItem = items.find((item) => item.name.toLowerCase() === nextName.trim().toLowerCase());
    setForm((current) => ({
      ...current,
      name: nextName,
      category: suggestedItem ? suggestedItem.category : current.category,
    }));
  };

  const selectSuggestion = (itemName) => {
    const suggestedItem = items.find((item) => item.name.toLowerCase() === itemName.toLowerCase());
    setForm((current) => ({
      ...current,
      name: itemName,
      category: suggestedItem ? suggestedItem.category : current.category,
    }));
  };

  const adjustFormField = (field, direction, min, max) => {
    setForm((current) => ({
      ...current,
      [field]: Math.min(Math.max(Number(current[field]) + direction, min), max),
    }));
  };

  const handleAddItem = (event) => {
    event.preventDefault();
    const itemName = form.name.trim();
    const quantity = Number(form.quantity);
    const quantityInUse = Math.min(Number(form.quantityInUse), quantity);
    if (!itemName || quantity < 1) return;

    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) =>
          item.name.toLowerCase() === itemName.toLowerCase() &&
          item.category.toLowerCase() === form.category.toLowerCase(),
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === existingItem.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                quantityInUse: item.quantityInUse + quantityInUse,
              }
            : item,
        );
      }

      const nextId = currentItems.length ? Math.max(...currentItems.map((item) => item.id)) + 1 : 1;
      return [
        { id: nextId, name: itemName, category: form.category, quantity, quantityInUse },
        ...currentItems,
      ];
    });

    setForm(emptyForm);
    setIsAdding(false);
  };

  const startRemovingItem = (id) => {
    setRemoveAmounts((current) => ({ ...current, [id]: current[id] || 1 }));
    setRemovingItemId(id);
  };

  const cancelRemovingItem = () => setRemovingItemId(null);

  const adjustRemoveAmount = (item, direction) => {
    setRemoveAmounts((current) => {
      const currentAmount = Number(current[item.id] || 1);
      const nextAmount = Math.min(Math.max(currentAmount + direction, 1), Math.max(item.quantity, 1));
      return { ...current, [item.id]: nextAmount };
    });
  };

  const handleRemoveAmountChange = (item, value) => {
    if (value === '') {
      setRemoveAmounts((current) => ({ ...current, [item.id]: '' }));
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    setRemoveAmounts((current) => ({
      ...current,
      [item.id]: Math.min(Math.max(parsed, 1), Math.max(item.quantity, 1)),
    }));
  };

  const getRemoveAmount = (item) => {
    const requestedAmount = Number(removeAmounts[item.id] || 1);
    if (!Number.isFinite(requestedAmount) || requestedAmount < 1) return 1;
    return Math.min(requestedAmount, Math.max(item.quantity, 1));
  };

  const handleRemoveItem = (item) => {
    const amountToRemove = getRemoveAmount(item);
    setItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === item.id
          ? {
              ...currentItem,
              quantity: currentItem.quantity - amountToRemove,
              quantityInUse: Math.min(currentItem.quantityInUse, currentItem.quantity - amountToRemove),
            }
          : currentItem,
      ),
    );
    setRemoveAmounts((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    setRemovingItemId(null);
  };

  const handleDeleteAll = () => {
    setItems([]);
    setCategory('');
  };

  const adjustInUse = (item, direction) => {
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id
          ? {
              ...currentItem,
              quantityInUse: Math.min(Math.max(currentItem.quantityInUse + direction, 0), currentItem.quantity),
            }
          : currentItem,
      ),
    );
  };

  const handleInUseChange = (item, value) => {
    if (value === '') {
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id ? { ...currentItem, quantityInUse: 0 } : currentItem,
        ),
      );
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, quantityInUse: Math.min(Math.max(parsed, 0), currentItem.quantity) }
          : currentItem,
      ),
    );
  };

  const RemoveControls = ({ item }) => (
    <div className="remove-confirm">
      <div className="stepper">
        <button className="stepper-button" type="button" disabled={getRemoveAmount(item) <= 1} onClick={() => adjustRemoveAmount(item, -1)}>-</button>
        <input
          className="stepper-input"
          type="number"
          min="1"
          max={item.quantity}
          value={removeAmounts[item.id] ?? 1}
          onChange={(e) => handleRemoveAmountChange(item, e.target.value)}
        />
        <button className="stepper-button" type="button" disabled={getRemoveAmount(item) >= item.quantity} onClick={() => adjustRemoveAmount(item, 1)}>+</button>
      </div>
      <button className="table-action" type="button" onClick={() => handleRemoveItem(item)}>Confirm</button>
      <button className="table-action table-action--muted" type="button" onClick={cancelRemovingItem}>Cancel</button>
    </div>
  );

  const InUseControls = ({ item }) => (
    <div className="stepper">
      <button className="stepper-button" type="button" disabled={item.quantityInUse <= 0} onClick={() => adjustInUse(item, -1)}>-</button>
      <input
        className="stepper-input"
        type="number"
        min="0"
        max={item.quantity}
        value={item.quantityInUse}
        onChange={(e) => handleInUseChange(item, e.target.value)}
      />
      <button className="stepper-button" type="button" disabled={item.quantityInUse >= item.quantity} onClick={() => adjustInUse(item, 1)}>+</button>
    </div>
  );

  return (
    <main className="page-shell">

      {/* Stats */}
      <section className="stats-grid" aria-label="Inventory status summary">
        {stats.map((stat) => (
          <article className={`panel stat-card accent-${stat.tone}`} key={stat.label}>
            <p className="eyebrow">{stat.label}</p>
            <p className="stat-card__value">{stat.value}</p>
          </article>
        ))}
      </section>

      {/* Toolbar */}
      <div className="section-header section-header--wrap">
        <h1>Inventory</h1>
        <div className="toolbar">
          <input
            className="search-input"
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Filter by category"
            className="select"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">All Categories</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <button className="button button--primary" type="button" onClick={() => setIsAdding((value) => !value)}>
            {isAdding ? 'Close' : 'Add Item'}
          </button>
          <button className="button button--secondary" type="button" onClick={handleDeleteAll} disabled={!items.length}>
            Delete All
          </button>
        </div>
      </div>

      {/* Add Item Form */}
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
                    {visibleSuggestions.map((itemName) => {
                      const suggestedItem = items.find((item) => item.name === itemName);
                      return (
                        <button
                          className="suggestion-option"
                          key={itemName}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectSuggestion(itemName)}
                        >
                          <span>{itemName}</span>
                          <small>{suggestedItem.category} · Qty {suggestedItem.quantity}</small>
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
            ) : (
              <label>
                Category
                <select className="select" name="category" value={form.category} onChange={handleFieldChange}>
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Quantity
              <div className="stepper">
                <button className="stepper-button" type="button" disabled={Number(form.quantity) <= 1} onClick={() => adjustFormField('quantity', -1, 1, 9999)}>-</button>
                <input className="stepper-input" type="number" min="1" name="quantity" value={form.quantity} onChange={handleFieldChange} />
                <button className="stepper-button" type="button" onClick={() => adjustFormField('quantity', 1, 1, 9999)}>+</button>
              </div>
            </label>

            <label>
              In Use
              <div className="stepper">
                <button className="stepper-button" type="button" disabled={Number(form.quantityInUse) <= 0} onClick={() => adjustFormField('quantityInUse', -1, 0, Number(form.quantity))}>-</button>
                <input className="stepper-input" type="number" min="0" name="quantityInUse" value={form.quantityInUse} onChange={handleFieldChange} />
                <button className="stepper-button" type="button" disabled={Number(form.quantityInUse) >= Number(form.quantity)} onClick={() => adjustFormField('quantityInUse', 1, 0, Number(form.quantity))}>+</button>
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

      {/* Desktop Table */}
      <section className="panel table-panel accent-red" aria-label="Inventory items">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>In Use</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length ? (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td className="item-name">{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.quantity}</td>
                    <td><InUseControls item={item} /></td>
                    <td><StatusBadge item={item} /></td>
                    <td>
                      {removingItemId === item.id ? (
                        <RemoveControls item={item} />
                      ) : (
                        <button className="table-action" type="button" onClick={() => startRemovingItem(item.id)}>Remove</button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="empty-state" colSpan="6">No inventory items to show.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Mobile Cards */}
      <section className="mobile-cards" aria-label="Inventory items mobile">
        {filteredItems.length ? (
          filteredItems.map((item) => (
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
                  <span className="eyebrow">In Use</span>
                  <InUseControls item={item} />
                </div>
              </div>
              <div className="inventory-card__footer">
                {removingItemId === item.id ? (
                  <RemoveControls item={item} />
                ) : (
                  <button className="table-action" type="button" onClick={() => startRemovingItem(item.id)}>Remove</button>
                )}
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state">No inventory items to show.</p>
        )}
      </section>

    </main>
  );
}