import React from "react";

interface MetricsCardProps {
  title: string;
  value: string | number;
}

export default function MetricsCard({ title, value }: MetricsCardProps) {
  return (
    <div className="p-4 bg-white shadow rounded-lg border border-gray-200">
      <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
