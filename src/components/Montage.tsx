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

type WarehouseQueries = {
  [key in typeof warehouses[number]]: ReturnType<typeof useGetStorageBalanceQuery>;
};

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

  const kz01Query = useGetStorageBalanceQuery('KZ01', { skip: !selectedWarehouses.includes('KZ01') });
  const k026Query = useGetStorageBalanceQuery('K026', { skip: !selectedWarehouses.includes('K026') });
  const kz02Query = useGetStorageBalanceQuery('KZ02', { skip: !selectedWarehouses.includes('KZ02') });
  const k046Query = useGetStorageBalanceQuery('K046', { skip: !selectedWarehouses.includes('K046') });
  const k018Query = useGetStorageBalanceQuery('K018', { skip: !selectedWarehouses.includes('K018') });
  const kz03Query = useGetStorageBalanceQuery('KZ03', { skip: !selectedWarehouses.includes('KZ03') });
  const t003Query = useGetStorageBalanceQuery('T003', { skip: !selectedWarehouses.includes('T003') });
  const t001Query = useGetStorageBalanceQuery('T001', { skip: !selectedWarehouses.includes('T001') });
  const te01Query = useGetStorageBalanceQuery('TE01', { skip: !selectedWarehouses.includes('TE01') });
  const z720Query = useGetStorageBalanceQuery('Z720', { skip: !selectedWarehouses.includes('Z720') });

  // Собираем все запросы в объект для удобного доступа
  const warehouseQueries: WarehouseQueries = useMemo(() => ({
    KZ01: kz01Query,
    K026: k026Query,
    KZ02: kz02Query,
    K046: k046Query,
    K018: k018Query,
    KZ03: kz03Query,
    T003: t003Query,
    T001: t001Query,
    TE01: te01Query,
    Z720: z720Query
  }), [kz01Query, k026Query, kz02Query, k046Query, k018Query, kz03Query, t003Query, t001Query, te01Query, z720Query]);

  const { isFetching, error, apiData } = useMemo(() => {
    const activeQueries = selectedWarehouses
      .filter((wh): wh is typeof warehouses[number] => warehouses.includes(wh as any))
      .map(wh => warehouseQueries[wh]);
    
    return {
      isFetching: activeQueries.some(query => query.isFetching),
      error: activeQueries.find(query => query.error)?.error,
      apiData: activeQueries.flatMap(query => query.data || [])
    };
  }, [selectedWarehouses, warehouseQueries]);

  const tableData: TableRow[] = useMemo(() => {
    if (!apiData || !Array.isArray(apiData)) return [];

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
        warehouse: warehouseCode
      };
    }).filter(Boolean) as TableRow[];
  }, [apiData, selectedRows]);

  useEffect(() => {
    if (!tableData || !selectedRows) return;
    
    const selectedData = tableData.reduce((acc, row) => {
      if (selectedRows[row.id]) {
        acc[row.id] = {
          name: row.name,
          sppElement: row.sppElement,
          count: row.count,
          warehouse: row.warehouse,
          destination: row.destination,
          party: row.party,
          sap: row.sap
        };
      }
      return acc;
    }, {} as Record<string, any>);

    onSelectedDataChange(selectedData);
  }, [selectedRows, tableData, onSelectedDataChange]);

  const filteredData = useMemo(() => {
    if (!tableData) return [];
    
    const lowerNameFilter = nameFilter.toLowerCase();
    const lowerOcFilter = ocFilter.toLowerCase();

    return tableData.filter(row => {
      const nameMatch = row.name.toLowerCase().includes(lowerNameFilter);
      const ocMatch = row.sppElement.toLowerCase().includes(lowerOcFilter);
      return nameMatch && (ocFilter ? ocMatch : true);
    });
  }, [tableData, nameFilter, ocFilter]);

  const handleWarehouseChange = (warehouse: string) => {
    setSelectedWarehouses(prev => 
      prev.includes(warehouse) 
        ? prev.length > 1 
          ? prev.filter(w => w !== warehouse)
          : prev
        : [...prev, warehouse]
    );
  };

  const handleSelectAllWarehouses = (selectAll: boolean) => {
    setSelectedWarehouses(selectAll ? [...warehouses] : [warehouses[0]]);
  };

  const handleRowSelect = (id: string) => {
    if (!selectedRows) return;
    onSelectChange({ ...selectedRows, [id]: !selectedRows[id] });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!tableData) return;
    const newSelected = tableData.reduce((acc, row) => ({ ...acc, [row.id]: e.target.checked }), {});
    onSelectChange(newSelected);
  };

  const selectedCount = useMemo(() => 
    selectedRows ? Object.values(selectedRows).filter(Boolean).length : 0, 
  [selectedRows]);

  const allSelected = useMemo(() => 
    tableData.length > 0 && selectedCount === tableData.length, 
  [tableData, selectedCount]);

  const getRowClassName = (row: TableRow) => 
    `${row.selected ? 'bg-blue-50' : 'bg-white'} hover:bg-gray-100`;

  return (
    <div className="max-w-6xl p-4 mx-auto">
      <h1 className="mb-4 text-2xl font-bold border-b pb-[66px]">Монтаж ТМЦ</h1>

      {/* Уведомления о состоянии */}
      {error && (
        <div className="p-4 mb-4 text-red-600 bg-red-100 rounded">
          Ошибка загрузки данных: {error.message}
        </div>
      )}
      {isFetching && (
        <div className="mb-4 text-center text-blue-600">Загрузка данных...</div>
      )}

      {/* Панель фильтров */}
      <div className="mb-8">
        <div className="flex flex-wrap items-end gap-4">
          {/* Выбор складов */}
          <div className="flex-1 min-w-[200px]" ref={dropdownRef}>
            <label className="block mb-2 font-medium">Склады:</label>
            <div className="relative">
              <button
                type="button"
                className="flex items-center justify-between w-full p-2 text-left bg-white border border-gray-300 rounded"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span>
                  {selectedWarehouses.length === warehouses.length
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
                        checked={selectedWarehouses.length === warehouses.length}
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
                          checked={selectedWarehouses.includes(warehouse)}
                          onChange={() => handleWarehouseChange(warehouse)}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-500"
                        />
                        <span className="ml-2">
                          {warehouse}
                          {warehouseQueries[warehouse]?.isFetching && ' (загрузка...)'}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Фильтр по названию */}
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="nameFilter" className="block mb-2 font-medium">
              Фильтр по названию:
            </label>
            <input
              type="text"
              id="nameFilter"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Введите часть названия"
            />
          </div>

          {/* Фильтр по СПП */}
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="ocFilter" className="block mb-2 font-medium">
              Фильтр по СПП:
            </label>
            <input
              type="text"
              id="ocFilter"
              value={ocFilter}
              onChange={(e) => setOcFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Введите номер СПП"
            />
          </div>
        </div>
        
        {/* Информация о выбранных данных */}
        <div className="mt-2 text-sm text-gray-600">
          <span>Количество элементов: {filteredData.length}</span>
          {selectedWarehouses.length > 0 && (
            <span className="ml-4">
              Выбранные склады: {selectedWarehouses.join(', ')}
            </span>
          )}
        </div>
      </div>

      {/* Таблица данных */}
      {filteredData.length > 0 ? (
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
              {filteredData.map((row) => (
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
      ) : (
        <div className="py-8 text-center text-gray-500">
          {tableData.length === 0
            ? `Нет данных для выбранных складов (${selectedWarehouses.join(', ')})`
            : 'Нет результатов по заданным фильтрам'}
        </div>
      )}
    </div>
  );
};

export default Montage;
