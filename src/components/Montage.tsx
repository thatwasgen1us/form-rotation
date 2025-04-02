import { useMemo, useState } from 'react';
import { StorageItem, useGetStorageBalanceQuery } from '../api/api';


interface MontageProps {
  selectedRows: Record<string, boolean>;
  onSelectChange: (selected: Record<string, boolean>) => void;
}

interface TableRow {
  id: string;
  ns: string;
  oc: number;
  name: string;
  quantity: number;
  sppElement: string;
  destination: string;
  selected: boolean;
  count: string;
}

const Montage = ({ selectedRows, onSelectChange }: MontageProps) => {
  const warehouses = ['KZ01', 'K026', 'KZ02', 'K046', 'K018', 'KZ03'];
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('KZ01');
  const [nameFilter, setNameFilter] = useState<string>('');
  const [ocFilter, setOcFilter] = useState<string>('');

  const { data: apiData = [], isFetching } = useGetStorageBalanceQuery(selectedWarehouse, {
    skip: !selectedWarehouse,
  });

  const tableData: TableRow[] = useMemo(() => {
    if (!apiData?.length) return [];

    return apiData.map((item: StorageItem, index: number) => {
      const id = `${item["СПП-элемент"] || 'unknown'}-${index}`;
      return {
        id,
        ns: item["Партия"] || selectedWarehouse,
        oc: index + 1,
        name: item["КрТекстМатериала"] || 'Неизвестное название',
        quantity: 1,
        sppElement: item["СПП-элемент"] || 'Неизвестный элемент',
        destination: item["Склад"],
        selected: selectedRows[id] || false,
        count: item["Количество запаса в партии"]
      };
    });
  }, [apiData, selectedWarehouse, selectedRows]);

  const filteredData = useMemo(() => {
    const lowerNameFilter = nameFilter.toLowerCase();

    return tableData.filter(row => {
      const nameMatch = row.name
        ? row.name.toLowerCase().includes(lowerNameFilter)
        : false;

      const ocMatch = ocFilter
        ? row.sppElement?.toString().includes(ocFilter) ?? false
        : true;

      return nameMatch && ocMatch;
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
    const newSelected = { ...selectedRows, [id]: !selectedRows[id] };
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

  return (
    <div className="max-w-6xl p-4 mx-auto">
      <h1 className="mb-6 text-2xl font-bold">Монтаж</h1>

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
              Фильтр по №OC:
            </label>
            <input
              type="text"
              id="ocFilter"
              value={ocFilter}
              onChange={handleOcFilterChange}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Введите номер OC"
            />
          </div>
        </div>
      </div>

      {isFetching && (
        <div className="mb-4 text-center">Загрузка данных...</div>
      )}

      {filteredData.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="w-10 px-4 py-2 border">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedCount === tableData.length && tableData.length > 0}
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
                <tr key={row.id} className={row.selected ? 'bg-blue-50' : (row.oc % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                  <td className="px-4 py-2 text-center border">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={() => handleRowSelect(row.id)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-2 border">{'1'}</td>
                  <td className="px-4 py-2 border">{row.name}</td>
                  <td className="px-4 py-2 text-center border">{row.count}</td>
                  <td className="px-4 py-2 text-center border">{row.sppElement}</td>
                  <td className="px-4 py-2 text-center border">{row.ns}</td>
                  <td className="px-4 py-2 border">{row.destination}</td>
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