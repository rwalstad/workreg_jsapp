'use client';

import { useState, useEffect } from 'react';
import { useActions } from 'actionsContext';
import PlaceholderReference from '@/app/components/PlaceholderReference';

interface Column {
  name: string;
  type: string;
}
const handlePlaceholderClick = (placeholder: string) => {
  console.log(`Placeholder clicked: ${placeholder}`);
  // Add your logic here to handle the clicked placeholder
  // For example, you might want to insert it into a text area or update some state
};
export default function DbAdminPage() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getIcon } = useActions();
  const [columns, setColumns] = useState<Column[]>([]); // Initialize as an empty array
  useEffect(() => {
    console.log("useEffect fetchTables : ");
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await fetch('/api/datatables?schema=LeadMaestro');
      if (!response.ok) throw new Error('Failed to fetch tables');
      const data = await response.json();
      setTables(data);
      setLoading(false);
    } catch (err) {
      setError('Error fetching tables');
      setLoading(false);
    }
  };

  const handleSelectTable = async (table: string) => {
    setSelectedTable(table);
    try {
      const response = await fetch(`/api/datatables/columns?schema=LeadMaestro&table=${table}`);
      if (!response.ok) throw new Error('Failed to fetch columns');
      const data: Column[] = await response.json(); // Correctly type as an array
      setColumns(data);
    } catch (err) {
      setError('Error fetching columns');
      setColumns([]); //reset columns on error.
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-heading font-bold text-accent">Database Administration</h2>
      <p>Administrate the database.</p>
      <a
        href="http://localhost:5555/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline"
      >
        Open External Page. make sure &apos;npx prisma studio&apos; is started on terminal
      </a>

      <div className="flex gap-6">
        <div className="w-1/4 bg-white p-4 rounded-lg lg:grid-cols-3 shadow-lg border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Select table</h2>
          </div>
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : tables.length === 0 ? (
            <p className="text-gray-500">No tables found.</p>
          ) : (
            <ul className="space-y-2 max-h-[500px] overflow-y-auto">
              {tables.map((table) => (
                <li
                  key={table}
                  className={`p-2 border rounded-lg cursor-pointer flex items-center gap-2 ${selectedTable === table ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                  onClick={() => handleSelectTable(table)}
                >
                  {getIcon('table')} <span>{table}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selectedTable && (
          <div className="w-2/3 bg-white p-4 rounded-lg shadow-lg border">
            <h2 className="text-lg font-semibold mb-4">Columns of {selectedTable}</h2>
            {columns.length === 0 ? (
              <p>No columns found.</p>
            ) : (
              <ul className="space-y-2 max-h-[300px] overflow-y-auto">
                {columns.map((column) => (
                  <li key={column.name} className="p-2 border rounded-lg">
                    <span className="font-medium">{column.name}</span>: {column.type}
                  </li>
                ))}
              </ul>
            )}
          <PlaceholderReference onPlaceholderClick={handlePlaceholderClick} />
          </div>
        )}
      </div>
    </div>
  );
}