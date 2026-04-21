import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const queryClient = new QueryClient();

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['merchant-stats'],
    queryFn: () => fetch('/api/merchant/stats').then(res => res.json()),
    refetchInterval: 2000 // auto-refresh to see orders coming in
  });

  if (isLoading) return <div className="p-8">加载数据大盘中...</div>;

  return (
    <div className="p-8 min-h-screen bg-gray-50 flex flex-col font-sans">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">商家业务大盘</h1>
      
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">今日总营收 (元)</p>
          <p className="text-3xl font-bold text-gray-900 font-mono">￥{data?.totalRevenue?.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">完成量</p>
          <p className="text-3xl font-bold text-emerald-600 font-mono">{data?.completedOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">总订单池</p>
          <p className="text-3xl font-bold text-gray-900 font-mono">{data?.totalOrders}</p>
        </div>
      </div>

      <div className="bg-white p-6 flex-1 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">实时订单趋势模拟</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={data?.trend || []}>
              <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="orders" fill="#000" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/merchant">
        <Routes>
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
