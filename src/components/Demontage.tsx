import { skipToken } from '@reduxjs/toolkit/query';
import { useMemo, useState, useEffect } from 'react';
import { useGetBaseBalanceQuery } from '../api/api';

interface BalanceSiteItem {
  "Название основного средства": string;
  "Основное средство": string;
  "Сайт": string;
}

interface RefundLogisticItem {
  "БС": string;
  "Код ПО": string;
  "Кол-во": number;
  "Комментарий логиста": string | null;
  "Куда ": string;
  "Название основного средства": string;
  "ОС": string;
  "№ заявки": string;
}

interface ApiResponse {
  balance_site: BalanceSiteItem[];
  refund_logistic: RefundLogisticItem[];
}

interface DemontageProps {
  selectedRows: Record<string, boolean>;
  onSelectChange: (selected: Record<string, boolean>) => void;
  rowWarehouses: Record<string, string>;
  onWarehouseChange: (warehouses: Record<string, string>) => void;
  onSelectedDataChange: (data: Record<string, any>) => void;
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
  requestNumber?: string;
}

const Demontage = ({
  selectedRows,
  onSelectChange,
  rowWarehouses,
  onWarehouseChange,
  onSelectedDataChange
}: DemontageProps) => {
  const warehouses = ['Не выбрано', 'KZ01', 'K026', 'KZ02', 'K046', 'K018', 'KZ03'];
  const [baseStation, setBaseStation] = useState<string>('NS00');
  const [nameFilter, setNameFilter] = useState<string>('');
  const [ocFilter, setOcFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'balance' | 'refund'>('balance');

  const { data, isFetching } = useGetBaseBalanceQuery(
    baseStation.startsWith('NS00') && baseStation.length === 8 ? baseStation : skipToken
  );

  const isApiResponse = (data: any): data is ApiResponse => {
    return data && Array.isArray(data.balance_site) && Array.isArray(data.refund_logistic);
  };

  // Balance site table data
  const balanceTableData: TableRow[] = useMemo(() => {
    if (!isApiResponse(data) || !data?.balance_site?.length) return [];

    return data.balance_site.map((item: BalanceSiteItem, index: number) => {
      const id = `${item["Основное средство"]}-${index}`;
      return {
        id,
        ns: item["Сайт"] || baseStation,
        oc: index + 1,
        name: item["Название основного средства"],
        quantity: 1,
        sppElement: item["Основное средство"],
        destination: rowWarehouses[id] || 'Не выбрано',
        selected: selectedRows[id] || false
      };
    });
  }, [data, baseStation, rowWarehouses, selectedRows]);

  // Refund logistic table data
  const refundTableData: TableRow[] = useMemo(() => {
    if (!isApiResponse(data) || !data?.refund_logistic?.length) return [];

    return data.refund_logistic.map((item: RefundLogisticItem, index: number) => {
      const id = `${item["ОС"]}`;
      return {
        id,
        ns: item["БС"] || baseStation,
        oc: index + 1,
        name: item["Название основного средства"],
        quantity: item["Кол-во"] || 1,
        sppElement: item["ОС"],
        destination: item["Куда "] || rowWarehouses[id] || 'Не выбрано',
        selected: selectedRows[id] || false,
        requestNumber: item["№ заявки"]
      };
    });
  }, [data, baseStation, rowWarehouses, selectedRows]);

  // Отправка данных выбранных строк в родительский компонент
  useEffect(() => {
    const selectedData: Record<string, any> = {};
    
    // Обрабатываем данные из активной вкладки
    const currentData = activeTab === 'balance' ? balanceTableData : refundTableData;
    
    currentData.forEach(row => {
      if (selectedRows[row.id]) {
        selectedData[row.id] = {
          name: row.name,
          sppElement: row.sppElement,
          quantity: row.quantity,
          requestNumber: row.requestNumber,
          baseStation: baseStation,
          destination: row.destination,
          ns: row.ns
        };
      }
    });

    onSelectedDataChange(selectedData);
  }, [selectedRows, balanceTableData, refundTableData, activeTab, baseStation, onSelectedDataChange]);

  const filteredBalanceData = useMemo(() => {
    return balanceTableData.filter(row => {
      const matchesName = row.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesOc = ocFilter ? row.sppElement.toString().includes(ocFilter) : true;
      return matchesName && matchesOc;
    });
  }, [balanceTableData, nameFilter, ocFilter]);

  const filteredRefundData = useMemo(() => {
    return refundTableData.filter(row => {
      const matchesName = row.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesOc = ocFilter ? row.sppElement.toString().includes(ocFilter) : true;
      return matchesName && matchesOc;
    });
  }, [refundTableData, nameFilter, ocFilter]);

  const handleStationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBaseStation(e.target.value.toUpperCase());
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
    const currentData = activeTab === 'balance' ? balanceTableData : refundTableData;
    const newSelected = currentData.reduce((acc, row) => {
      acc[row.id] = isChecked;
      return acc;
    }, {} as Record<string, boolean>);
    onSelectChange(newSelected);
  };

  const handleWarehouseChange = (id: string, warehouse: string) => {
    const newWarehouses = { ...rowWarehouses, [id]: warehouse };
    onWarehouseChange(newWarehouses);
  };

  const selectedCount = Object.values(selectedRows).filter(Boolean).length;
  const currentData = activeTab === 'balance' ? filteredBalanceData : filteredRefundData;
  const totalData = activeTab === 'balance' ? balanceTableData : refundTableData;

  return (
    <div className="max-w-6xl p-4 mx-auto">
      <h1 className="mb-6 text-2xl font-bold">Демонтаж ОС</h1>

      <div className="mb-4">
        <div className="flex border-b">
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'balance' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('balance')}
          >
            Основные средства
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'refund' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('refund')}
          >
            Логистика возвратов
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="baseStation" className="block mb-2 font-medium">
              Номер базовой станции:
            </label>
            <input
              type="text"
              id="baseStation"
              value={baseStation}
              onChange={handleStationChange}
              className="w-full p-2 border border-gray-300 rounded"
              required
              placeholder="Введите NS номер (например, NS001120)"
              pattern="NS\d{6}"
              title="Введите номер в формате NS001120"
            />
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

      {currentData.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="w-10 px-4 py-2 border">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedCount === totalData.length && totalData.length > 0}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-2 border">№ OC</th>
                <th className="px-4 py-2 border">Наименование</th>
                <th className="px-4 py-2 border">Количество</th>
                {activeTab === 'refund' && <th className="px-4 py-2 border">№ заявки</th>}
                <th className="px-4 py-2 border">СПП Элемент</th>
                <th className="px-4 py-2 border">Куда</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((row: TableRow) => (
                <tr key={row.id} className={row.selected ? 'bg-blue-50' : (row.oc % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                  <td className="px-4 py-2 text-center border">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={() => handleRowSelect(row.id)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-2 border">{row.oc}</td>
                  <td className="px-4 py-2 border">{row.name}</td>
                  <td className="px-4 py-2 text-center border">{row.quantity}</td>
                  {activeTab === 'refund' && (
                    <td className="px-4 py-2 border">{row.requestNumber}</td>
                  )}
                  <td className="px-4 py-2 text-center border">{row.sppElement}</td>
                  <td className="px-4 py-2 border">
                    <select
                      value={row.destination}
                      onChange={(e) => handleWarehouseChange(row.id, e.target.value)}
                      className="w-full p-1 border border-gray-300 rounded"
                    >
                      {warehouses.map(warehouse => (
                        <option key={warehouse} value={warehouse}>
                          {warehouse}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-sm text-gray-600">
            Выбрано: {selectedCount} из {totalData.length}
          </div>
        </div>
      ) : !isFetching && baseStation.startsWith('NS') && (
        <div className="text-center text-gray-500">
          {totalData.length === 0
            ? `Нет данных для базовой станции ${baseStation}`
            : 'Нет результатов по заданным фильтрам'}
        </div>
      )}
    </div>
  );
};

export default Demontage;
