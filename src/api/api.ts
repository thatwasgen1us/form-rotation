import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

interface FormItem {
  id: string;
  type: 'demontage' | 'montage';
  destination?: string;
}

export const Api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "https://10.77.28.213:8000/",
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    }
  }),
  endpoints: (builder) => ({
    GetBaseBalance: builder.query<EquipmentItem[], string>({
      query: (base) => `balance/${base}`,
    }),
    GetStorageBalance: builder.query<StorageItem[], string>({
      query: (base) => `storage/${base}`,
    }),
    SendForm: builder.mutation<{
      message: string,
      success: boolean
    }, {
      items: FormItem[]
    }>({
      query: (body) => ({
        url: '/report',
        method: 'POST',
        body: JSON.stringify(body),
      }),
    }),
  }),
});

export const {
  useGetBaseBalanceQuery,
  useGetStorageBalanceQuery,
  useSendFormMutation
} = Api;

// Типы для оборудования
interface EquipmentItem {
  "balance_site": FirstObj[],
  "refund_logistic": SecondObj[]
}

interface FirstObj {
  "Название основного средства": string,
  "Основное средство": string,
  "Сайт": string
}

interface SecondObj {
  "БС": string,
  "Код ПО": string,
  "Кол-во": number,
  "Комментарий логиста": null | string,
  "Куда ": string,
  "Название основного средства": string,
  "ОС": string,
  "№ заявки": string
}

export interface StorageItem {
  "Количество запаса в партии": string;
  "КрТекстМатериала": string;
  "Партия": string;
  "СПП-элемент": string;
  "Склад": string;
  "Основное средство" : string
}
