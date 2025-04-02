import { useState } from 'react';
import Demontage from "./components/Demontage";
import Montage from "./components/Montage";
import { useSendFormMutation } from './api/api';

export interface FormItem {
  id: string;
  type: 'demontage' | 'montage';
  destination?: string;
}

function App() {
  const [demontageSelected, setDemontageSelected] = useState<Record<string, boolean>>({});
  const [montageSelected, setMontageSelected] = useState<Record<string, boolean>>({});
  const [rowWarehouses, setRowWarehouses] = useState<Record<string, string>>({});
  const [sendForm] = useSendFormMutation();
  const [showSelectedList, setShowSelectedList] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Подготовка данных для отправки
      const demontageItems = Object.entries(demontageSelected)
        .filter(([_, selected]) => selected)
        .map(([id]) => ({
          id,
          destination: rowWarehouses[id] || 'Не выбрано',
          type: 'demontage' as const
        }));

      const montageItems = Object.entries(montageSelected)
        .filter(([_, selected]) => selected)
        .map(([id]) => ({
          id,
          type: 'montage' as const
        }));

      const allItems = [...demontageItems, ...montageItems];
      
      if (allItems.length === 0) {
        alert('Выберите хотя бы один элемент');
        return;
      }

      // Отправка данных на сервер
      const response = await sendForm({ items: allItems }).unwrap();
      alert(`Успешно отправлено: ${response.message}`);
      
      // Сброс состояния
      setDemontageSelected({});
      setMontageSelected({});
      setRowWarehouses({});
    } catch (error) {
      alert('Ошибка при отправке данных');
      console.error(error);
    }
  };

  // Получаем список выбранных элементов
  const getSelectedItems = () => {
    const demontageItems = Object.entries(demontageSelected)
      .filter(([_, selected]) => selected)
      .map(([id]) => ({
        id,
        type: 'demontage' as const,
        destination: rowWarehouses[id] || 'Не выбрано'
      }));

    const montageItems = Object.entries(montageSelected)
      .filter(([_, selected]) => selected)
      .map(([id]) => ({
        id,
        type: 'montage' as const
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
        />
        <Montage 
          selectedRows={montageSelected}
          onSelectChange={setMontageSelected}
        />
      </div>
      
      {/* Список выбранных элементов */}
      {showSelectedList && selectedItems.length > 0 && (
        <div className="fixed p-4 overflow-y-auto bg-white border rounded-lg shadow-lg bottom-20 right-4 max-h-60">
          <h3 className="mb-2 font-bold">Выбранные элементы:</h3>
          <ul className="space-y-2">
            {selectedItems.map((item) => (
              <li key={`${item.type}-${item.id}`} className="flex items-center">
                <span className="font-medium">
                  {item.type === 'demontage' ? 'Демонтаж' : 'Монтаж'}: {item.id}
                </span>
                {item.type === 'demontage' && (
                  <span className="ml-2 text-sm text-gray-600">
                    (Склад: {item.destination})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="sticky bottom-0 p-4 bg-white border-t shadow-lg">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
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
      </form>
    </div>
  );
}

export default App;