import React from "react";

const CLASS_BY_STATUS = {
  success: "badge-success",
  running: "badge-running",
  pending: "badge-pending",
  failed: "badge-failed",
};

export default function StatusBadge({ status }) {
  const cls = CLASS_BY_STATUS[status] || "badge-pending";
  return <span className={`badge ${cls}`}>{status}</span>;
}
