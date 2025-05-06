import { useState } from 'react';
import Demontage from "./components/Demontage";
import Montage from "./components/Montage";
import { useGetReportNamesQuery, useSendFormMutation } from './api/api';

export interface FormItem {
  id: string;
  type: 'demontage' | 'montage';
  destination?: string;
    data: {
    name: string;
    sppElement: string;
    quantity: number;
    count?: string;
    requestNumber?: string;
    baseStation?: string;
    warehouse?: string;
    ns?: string;
  };
}

function App() {
  const [demontageSelected, setDemontageSelected] = useState<Record<string, boolean>>({});
  const [montageSelected, setMontageSelected] = useState<Record<string, boolean>>({});
  const [rowWarehouses, setRowWarehouses] = useState<Record<string, string>>({});
  const [sendForm] = useSendFormMutation();
  const [showSelectedList, setShowSelectedList] = useState(false);
  const [demontageData, setDemontageData] = useState<Record<string, any>>({});
  const [montageData, setMontageData] = useState<Record<string, any>>({});
  const [demontageBaseStation, setDemontageBaseStation] = useState('NS00');
  const [reportName, setReportName] = useState('');
  const [useExistingReport, setUseExistingReport] = useState(true);
  const { data } = useGetReportNamesQuery();
  
  // Ensure reportNames is always an array of strings
  const reportNames = data ? Object.keys(data).flatMap(item => {
    if (typeof item === 'object' && item !== null) {
      return Object.values(item).filter(val => typeof val === 'string');
    }
    return typeof item === 'string' ? item : [];
  }) : [];

  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!reportName.trim()) {
        alert('Укажите имя отчёта');
        return;
      }

      const demontageItems = Object.entries(demontageSelected)
        .filter(([_, selected]) => selected)
        .map(([id]) => ({
          id,
          type: 'demontage' as const,
          destination: rowWarehouses[id] || 'Не выбрано',
          data: demontageData[id] || {}
        }));

      const montageItems = Object.entries(montageSelected)
        .filter(([_, selected]) => selected)
        .map(([id]) => ({
          id,
          type: 'montage' as const,
          data: montageData[id] || {}
        }));

      const allItems = [...demontageItems, ...montageItems];
      
      if (allItems.length === 0) {
        alert('Выберите хотя бы один элемент');
        return;
      }

      const response = await sendForm({ 
        items: allItems,
        reportName: reportName.trim() 
      }).unwrap();
      
      alert(`Успешно отправлено: ${response.message}`);
      
      setDemontageSelected({});
      setMontageSelected({});
      setRowWarehouses({});
      setDemontageData({});
      setMontageData({});
      setReportName('');
    } catch (error) {
      alert('Ошибка при отправке данных');
      console.error(error);
    }
  };

  const getSelectedItems = (): FormItem[] => {
    const demontageItems = Object.entries(demontageSelected)
      .filter(([_, selected]) => selected)
      .map(([id]) => ({
        id,
        type: 'demontage' as const,
        destination: rowWarehouses[id] || 'Не выбрано',
        data: demontageData[id] || {}
      }));

    const montageItems = Object.entries(montageSelected)
      .filter(([_, selected]) => selected)
      .map(([id]) => ({
        id,
        type: 'montage' as const,
        data: montageData[id] || {}
      }));

    return [...demontageItems, ...montageItems];
  };

  const selectedItems = getSelectedItems();
  const totalSelected = selectedItems.length;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-1">
        <Demontage 
          selectedRows={demontageSelected}
          onSelectChange={setDemontageSelected}
          rowWarehouses={rowWarehouses}
          onWarehouseChange={setRowWarehouses}
          onSelectedDataChange={setDemontageData}
          onBaseStationChange={setDemontageBaseStation}
        />
        <Montage 
          selectedRows={montageSelected}
          onSelectChange={setMontageSelected}
          onSelectedDataChange={setMontageData}
          demontageBaseStation={demontageBaseStation}
        />
      </div>
      
      {showSelectedList && selectedItems.length > 0 && (
        <div className="fixed p-4 overflow-y-auto bg-white border rounded-lg shadow-lg bottom-20 right-4 max-h-60">
          <h3 className="mb-2 font-bold">Выбранные элементы:</h3>
          <ul className="space-y-2">
            {selectedItems.map((item, index) => (
              <li key={`${item.type}-${item.id}-${index}`} className="flex flex-col">
                <div className="flex items-center">
                  <span className="font-medium">
                    {item.type === 'demontage' ? 'Демонтаж' : 'Монтаж'}: {item.data.name || item.id}
                  </span>
                  {item.type === 'demontage' && (
                    <span className="ml-2 text-sm text-gray-600">
                      (Склад: {item.destination})
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  СПП: {item.data.sppElement}
                  {item.data.requestNumber && ` | Заявка: ${item.data.requestNumber}`}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="sticky bottom-0 p-4 bg-white border-t shadow-lg">
        <div className="flex flex-col max-w-6xl gap-4 mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="font-medium">
                Выбрано элементов: {totalSelected}
              </span>
              {totalSelected > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSelectedList(!showSelectedList)}
                  className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                >
                  {showSelectedList ? 'Скрыть список' : 'Показать список'}
                </button>
              )}
            </div>
            <button 
              type="submit"
              disabled={totalSelected === 0}
              className={`px-6 py-3 text-white rounded-lg shadow ${
                totalSelected > 0 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Отправить на монтаж/демонтаж
            </button>
          </div>
          
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="existingReport"
                checked={useExistingReport}
                onChange={() => setUseExistingReport(true)}
              />
              <label htmlFor="existingReport">Выбрать существующий отчёт</label>
              
              <input
                type="radio"
                id="newReport"
                checked={!useExistingReport}
                onChange={() => setUseExistingReport(false)}
              />
              <label htmlFor="newReport">Создать новый отчёт</label>
            </div>
            
            {useExistingReport ? (
              <select
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="p-2 border rounded"
                required
              >
                <option value="">Выберите отчёт</option>
                {reportNames.map((name, index) => (
                  <option key={`${name}-${index}`} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Введите имя нового отчёта"
                className="p-2 border rounded"
                required
              />
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

export default App;
