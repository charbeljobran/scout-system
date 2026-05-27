import React from "react";
import { getStatus } from "../data/inventory.js";

const statusClassNames = {
  Available: "status-badge status-badge--available",
  "Low Stock": "status-badge status-badge--low",
  "Out of Stock": "status-badge status-badge--out",
};

export default function StatusBadge({ item }) {
  const status = getStatus(item);

  return <span className={statusClassNames[status]}>{status}</span>;
}
