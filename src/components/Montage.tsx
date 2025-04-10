import { useEffect, useMemo, useRef, useState } from 'react';
import { StorageItem, useGetStorageBalanceQuery } from '../api/api';

interface MontageProps {
  selectedRows: Record<string, boolean>;
  onSelectChange: (selected: Record<string, boolean>) => void;
  onSelectedDataChange: (data: Record<string, any>) => void;
  demontageBaseStation: string;
}

interface TableRow {
  id: string;
  party: string;
  sap: string;
  name: string;
  sppElement: string;
  destination: string;
  selected: boolean;
  count: string;
  warehouse: string;
}

const warehouses = ['KZ01', 'K026', 'KZ02', 'K046', 'K018', 'KZ03', 'T003', 'T001', 'TE01', 'Z720'] as const;

const Montage = ({
  selectedRows,
  onSelectChange,
  onSelectedDataChange,
  demontageBaseStation
}: MontageProps) => {
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([warehouses[0]]);
  const [nameFilter, setNameFilter] = useState<string>('');
  const [ocFilter, setOcFilter] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Закрытие dropdown при клике вне его области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Объявляем результаты запросов для каждого склада отдельно
  // Это нужно чтобы избежать создания запросов внутри useMemo
  const warehouseQueryResults = warehouses.map(warehouse => {
    const isSelected = selectedWarehouses.includes(warehouse);
    return useGetStorageBalanceQuery(warehouse, { skip: !isSelected });
  });

  // Фильтруем только запросы к выбранным складам
  const selectedWarehouseQueries = useMemo(() => {
    return warehouses
      .filter(warehouse => selectedWarehouses.includes(warehouse))
      .map((_, index) => warehouseQueryResults[index]);
  }, [selectedWarehouses, warehouseQueryResults]);

  const isFetching = useMemo(() => {
    return selectedWarehouseQueries.some(query => query?.isFetching);
  }, [selectedWarehouseQueries]);
  
  const apiData = useMemo(() => {
    if (!selectedWarehouseQueries || selectedWarehouseQueries.length === 0) {
      return [];
    }
    return selectedWarehouseQueries.flatMap(query => query?.data || []);
  }, [selectedWarehouseQueries]);

  const tableData: TableRow[] = useMemo(() => {
    if (!apiData || !Array.isArray(apiData) || apiData.length === 0) return [];

    return apiData.map((item: StorageItem, index: number) => {
      if (!item) return null;
      
      const sppElement = item["СПП-элемент"] || 'unknown';
      const id = `${sppElement}-${index}`;
      const warehouseCode = item["Склад"] || '';
      
      return {
        id,
        party: item["Партия"] || item["Склад"] || '',
        sap: String(item["Основное средство"] || ''),
        name: item["КрТекстМатериала"] || 'Неизвестное название',
        sppElement,
        destination: item["Склад"] || '',
        selected: selectedRows?.[id] || false,
        count: item["Количество запаса в партии"] || '0',
        warehouse: warehouseCode  // Явно заполняем поле warehouse из поля "Склад"
      };
    }).filter(Boolean) as TableRow[];
  }, [apiData, selectedRows]);

  useEffect(() => {
    if (!tableData || !Array.isArray(tableData) || tableData.length === 0) return;
    if (!selectedRows) return;
    
    const selectedData: Record<string, any> = {};

    tableData.forEach(row => {
      if (selectedRows[row.id]) {
        selectedData[row.id] = {
          name: row.name,
          sppElement: row.sppElement,
          count: row.count,
          warehouse: row.warehouse,  // Используем поле warehouse вместо destination
          destination: row.destination,
          party: row.party,
          sap: row.sap
        };
      }
    });

    onSelectedDataChange(selectedData);
  }, [selectedRows, tableData, onSelectedDataChange]);

  const filteredData = useMemo(() => {
    if (!tableData || !Array.isArray(tableData) || tableData.length === 0) return [];
    
    const lowerNameFilter = (nameFilter || '').toLowerCase();
    const lowerOcFilter = (ocFilter || '').toLowerCase();

    return tableData.filter(row => {
      if (!row || !row.name || !row.sppElement) return false;
      
      const nameMatch = row.name.toLowerCase().includes(lowerNameFilter);
      const ocMatch = row.sppElement.toLowerCase().includes(lowerOcFilter);

      return nameMatch && (ocFilter ? ocMatch : true);
    });
  }, [tableData, nameFilter, ocFilter]);

  const handleWarehouseChange = (warehouse: string) => {
    setSelectedWarehouses(prev => {
      if (!prev || !Array.isArray(prev)) return [warehouse];
      
      if (prev.includes(warehouse)) {
        const result = prev.filter(w => w !== warehouse);
        return result.length === 0 ? [warehouses[0]] : result; // Всегда оставляем хотя бы один склад выбранным
      } else {
        return [...prev, warehouse];
      }
    });
  };

  const handleSelectAllWarehouses = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedWarehouses([...warehouses]);
    } else {
      setSelectedWarehouses([warehouses[0]]); // Оставляем первый склад выбранным по умолчанию
    }
  };

  const handleNameFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameFilter(e.target.value);
  };

  const handleOcFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOcFilter(e.target.value);
  };

  const handleRowSelect = (id: string) => {
    if (!selectedRows) return;
    
    const newSelected = {
      ...selectedRows,
      [id]: !selectedRows[id]
    };
    onSelectChange(newSelected);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!tableData || !Array.isArray(tableData)) return;
    
    const isChecked = e.target.checked;
    const newSelected = tableData.reduce((acc, row) => {
      if (row && row.id) {
        acc[row.id] = isChecked;
      }
      return acc;
    }, {} as Record<string, boolean>);
    onSelectChange(newSelected);
  };

  const selectedCount = useMemo(() => {
    if (!selectedRows || typeof selectedRows !== 'object') return 0;
    return Object.values(selectedRows).filter(Boolean).length;
  }, [selectedRows]);
  
  const allSelected = useMemo(() => {
    if (!tableData || !Array.isArray(tableData) || tableData.length === 0) return false;
    return tableData.length > 0 && selectedCount === tableData.length;
  }, [tableData, selectedCount]);

  const getRowClassName = (row: TableRow) => {
    if (!row) return '';
    const baseClass = row.selected ? 'bg-blue-50' : 'bg-white';
    return `${baseClass} hover:bg-gray-100`;
  };

  return (
    <div className="max-w-6xl p-4 mx-auto">
      <h1 className="mb-4 text-2xl font-bold border-b pb-[66px]">Монтаж ТМЦ</h1>

      <div className="mb-8">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]" ref={dropdownRef}>
            <label className="block mb-2 font-medium">
              Склады:
            </label>
            <div className="relative">
              <button
                type="button"
                className="flex items-center justify-between w-full p-2 text-left bg-white border border-gray-300 rounded"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span>
                  {!selectedWarehouses || selectedWarehouses.length === 0
                    ? 'Выберите склады'
                    : selectedWarehouses.length === warehouses.length
                      ? 'Все склады'
                      : `${selectedWarehouses.length} выбрано`}
                </span>
                <svg
                  className={`w-5 h-5 transition-transform ${dropdownOpen ? 'transform rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute z-10 w-full mt-1 overflow-auto bg-white border border-gray-300 rounded shadow-lg max-h-60">
                  <div className="p-2 border-b border-gray-200">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedWarehouses && selectedWarehouses.length === warehouses.length}
                        onChange={(e) => handleSelectAllWarehouses(e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-500"
                      />
                      <span className="ml-2">Выбрать все</span>
                    </label>
                  </div>
                  {warehouses.map(warehouse => (
                    <div key={warehouse} className="p-2 hover:bg-gray-50">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedWarehouses && selectedWarehouses.includes(warehouse)}
                          onChange={() => handleWarehouseChange(warehouse)}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-500"
                        />
                        <span className="ml-2">{warehouse}</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label htmlFor="nameFilter" className="block mb-2 font-medium">
              Фильтр по названию:
            </label>
            <input
              type="text"
              id="nameFilter"
              value={nameFilter}
              onChange={handleNameFilterChange}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Введите часть названия"
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label htmlFor="ocFilter" className="block mb-2 font-medium">
              Фильтр по СПП:
            </label>
            <input
              type="text"
              id="ocFilter"
              value={ocFilter}
              onChange={handleOcFilterChange}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Введите номер СПП"
            />
          </div>
        </div>
        <div className="mt-2">
          Количество элементов: {filteredData.length}
          {selectedWarehouses && selectedWarehouses.length > 0 && (
            <span className="ml-4">
              Выбранные склады: {selectedWarehouses.join(', ')}
            </span>
          )}
        </div>
      </div>

      {isFetching && (
        <div className="mb-4 text-center">Загрузка данных...</div>
      )}

      {filteredData.length > 0 && !isFetching ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="w-10 px-4 py-2 border">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={allSelected}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-2 border">№ OC</th>
                <th className="px-4 py-2 border">Наименование</th>
                <th className="px-4 py-2 border">Количество</th>
                <th className="px-4 py-2 border">СПП Элемент</th>
                <th className="px-4 py-2 border">Партия</th>
                <th className="px-4 py-2 border">Склад</th>
                <th className="px-4 py-2 border">Куда</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row: TableRow) => (
                <tr key={row.id} className={getRowClassName(row)}>
                  <td className="px-4 py-2 text-center border">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={() => handleRowSelect(row.id)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-2 border">{row.sap}</td>
                  <td className="px-4 py-2 border">{row.name}</td>
                  <td className="px-4 py-2 text-center border">{row.count}</td>
                  <td className="px-4 py-2 text-center border">{row.sppElement}</td>
                  <td className="px-4 py-2 text-center border">{row.party}</td>
                  <td className="px-4 py-2 text-center border">{row.warehouse}</td>
                  <td className="px-4 py-2 border">{demontageBaseStation}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-sm text-gray-600">
            Выбрано: {selectedCount} из {tableData.length}
          </div>
        </div>
      ) : !isFetching && selectedWarehouses && selectedWarehouses.length > 0 && (
        <div className="text-center text-gray-500">
          {!tableData || tableData.length === 0
            ? `Нет данных для выбранных складов (${selectedWarehouses.join(', ')})`
            : 'Нет результатов по заданным фильтрам'}
        </div>
      )}
    </div>
  );
};

export default Montage;
