import { useMemo, useState, useEffect } from 'react';
import { StorageItem, useGetStorageBalanceQuery } from '../api/api';

interface MontageProps {
  selectedRows: Record<string, boolean>;
  onSelectChange: (selected: Record<string, boolean>) => void;
  onSelectedDataChange: (data: Record<string, any>) => void;
  demontageBaseStation: string
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
}

const warehouses = ['KZ01', 'K026', 'KZ02', 'K046', 'K018', 'KZ03', 'T003', 'T001', 'TE01', 'Z720'] as const;

const Montage = ({ 
  selectedRows, 
  onSelectChange,
  onSelectedDataChange,
  demontageBaseStation 
}: MontageProps) => {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(warehouses[0]);
  const [nameFilter, setNameFilter] = useState<string>('');
  const [ocFilter, setOcFilter] = useState<string>('');

  const { data: apiData = [], isFetching } = useGetStorageBalanceQuery(selectedWarehouse, {
    skip: !selectedWarehouse,
  });

  const tableData: TableRow[] = useMemo(() => {
    if (!apiData?.length) return [];
  
    return apiData.map((item: StorageItem, index: number) => {
      // Добавляем index к id для уникальности
      const id = `${item["СПП-элемент"]}-${index}`;
      return {
        id,        
        party: item["Партия"] || selectedWarehouse,
        sap: String(item["Основное средство"]),
        name: item["КрТекстМатериала"] || 'Неизвестное название',
        sppElement: item["СПП-элемент"] || 'Неизвестный элемент',
        destination: item["Склад"],
        selected: selectedRows[id] || false,
        count: item["Количество запаса в партии"]
      };
    });
  }, [apiData, selectedWarehouse, selectedRows]);

  useEffect(() => {
    const selectedData: Record<string, any> = {};
    
    tableData.forEach(row => {
      if (selectedRows[row.id]) {
        selectedData[row.id] = {
          name: row.name,
          sppElement: row.sppElement,
          count: row.count,
          warehouse: selectedWarehouse,
          destination: row.destination,
          party: row.party,
          sap: row.sap
        };
      }
    });

    onSelectedDataChange(selectedData);
  }, [selectedRows, tableData, selectedWarehouse, onSelectedDataChange]);

  const filteredData = useMemo(() => {
    const lowerNameFilter = nameFilter.toLowerCase();
    const lowerOcFilter = ocFilter.toLowerCase();

    return tableData.filter(row => {
      const nameMatch = row.name.toLowerCase().includes(lowerNameFilter);
      const ocMatch = row.sppElement.toLowerCase().includes(lowerOcFilter);
      
      return nameMatch && (ocFilter ? ocMatch : true);
    });
  }, [tableData, nameFilter, ocFilter]);

  const handleWarehouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWarehouse(e.target.value);
  };

  const handleNameFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameFilter(e.target.value);
  };

  const handleOcFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOcFilter(e.target.value);
  };

  const handleRowSelect = (id: string) => {
    const newSelected = { 
      ...selectedRows, 
      [id]: !selectedRows[id] 
    };
    console.log('Selected rows:', newSelected); // Для отладки
    onSelectChange(newSelected);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    const newSelected = tableData.reduce((acc, row) => {
      acc[row.id] = isChecked;
      return acc;
    }, {} as Record<string, boolean>);
    onSelectChange(newSelected);
  };

  const selectedCount = Object.values(selectedRows).filter(Boolean).length;
  const allSelected = tableData.length > 0 && selectedCount === tableData.length;

  const getRowClassName = (row: TableRow) => {
    const baseClass = row.selected ? 'bg-blue-50' : 'bg-white';
    return `${baseClass} hover:bg-gray-100`;
  };

  return (
    <div className="max-w-6xl p-4 mx-auto ">
      <h1 className="mb-4 text-2xl font-bold border-b pb-[66px]">Монтаж ТМЦ</h1>

      <div className="mb-8">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="warehouse" className="block mb-2 font-medium">
              Склад:
            </label>
            <select
              id="warehouse"
              value={selectedWarehouse}
              onChange={handleWarehouseChange}
              className="w-full p-2 border border-gray-300 rounded"
            >
              {warehouses.map(warehouse => (
                <option key={warehouse} value={warehouse}>
                  {warehouse}
                </option>
              ))}
            </select>
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
        <div>
        Количество элементов: {filteredData.length}
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
                  <td className="px-4 py-2 border">{demontageBaseStation}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-sm text-gray-600">
            Выбрано: {selectedCount} из {tableData.length}
          </div>
        </div>
      ) : !isFetching && selectedWarehouse && (
        <div className="text-center text-gray-500">
          {tableData.length === 0
            ? `Нет данных для склада ${selectedWarehouse}`
            : 'Нет результатов по заданным фильтрам'}
        </div>
      )}
    </div>
  );
};

export default Montage;
