import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';
import { create } from 'zustand';

const queryClient = new QueryClient();

interface CartState {
  items: Record<string, number>;
  add: (id: string, maxStock: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}
const useCart = create<CartState>((set) => ({
  items: {},
  add: (id, maxStock) => set((state) => {
    const current = state.items[id] || 0;
    if (current >= maxStock) return state;
    return { items: { ...state.items, [id]: current + 1 } };
  }),
  remove: (id) => set((state) => {
    const current = state.items[id] || 0;
    if (current <= 1) {
      const { [id]: _, ...rest } = state.items;
      return { items: rest };
    }
    return { items: { ...state.items, [id]: current - 1 } };
  }),
  clear: () => set({ items: {} }),
}));

function Menu() {
  const { data: menuItems, isLoading } = useQuery({
    queryKey: ['menu'],
    queryFn: () => fetch('/api/catalog/menu').then(res => res.json())
  });

  const cart = useCart(s => s.items);
  const add = useCart(s => s.add);
  const remove = useCart(s => s.remove);
  const clearCart = useCart(s => s.clear);

  const cartKeys = Object.keys(cart);
  const totalItems = cartKeys.reduce((acc, k) => acc + cart[k], 0);
  const totalPrice = cartKeys.reduce((acc, k) => {
    const item = menuItems?.find((i: any) => i.id === k);
    return acc + (item?.price || 0) * cart[k];
  }, 0);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        items: cartKeys.map(k => ({ itemId: k, qty: cart[k] }))
      };
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
         const d = await res.json();
         throw new Error(d.message || '下单失败');
      }
      return res.json();
    },
    onSuccess: () => {
      alert('✅ 下单成功！库存已锁定。');
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['menu'] }); // Refresh inventory 
    },
    onError: (err: any) => {
      alert(`❌ 失败: ${err.message}`);
    }
  });

  if (isLoading) return <div className="p-4 text-gray-500 text-center mt-10">菜单数据加载中...</div>;

  return (
    <div className="p-4 pb-24 font-sans max-w-lg mx-auto">
      <h1 className="text-2xl font-black mb-6 text-gray-900 tracking-tight">午高峰抢单</h1>
      <div className="grid gap-4">
        {menuItems?.map((item: any) => (
          <div key={item.id} className="border border-gray-100 p-4 rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white relative overflow-hidden">
            {item.stock === 0 && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center font-bold text-red-500">已售罄</div>
            )}
            <div>
              <p className="font-bold text-lg text-gray-900">{item.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-red-500 font-bold font-mono">￥{item.price}</p>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">剩 {item.stock} 份</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-lg">
              <button 
                onClick={() => remove(item.id)} 
                disabled={!cart[item.id]}
                className="w-8 h-8 flex items-center justify-center text-gray-600 disabled:opacity-30 bg-white rounded shadow-sm border border-gray-200"
              >-</button>
              <span className="w-4 text-center font-bold">{cart[item.id] || 0}</span>
              <button 
                onClick={() => add(item.id, item.stock)} 
                disabled={cart[item.id] >= item.stock}
                className="w-8 h-8 flex items-center justify-center text-gray-600 disabled:opacity-30 bg-white rounded shadow-sm border border-gray-200"
              >+</button>
            </div>
          </div>
        ))}
      </div>

      {totalItems > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgb(0,0,0,0.05)] z-20">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">合计清单 ({totalItems} 件)</p>
              <p className="text-xl font-bold text-red-500 font-mono">￥{totalPrice.toFixed(2)}</p>
            </div>
            <button 
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              className="bg-black text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-gray-800 transition active:scale-95 disabled:opacity-50"
            >
              {checkoutMutation.isPending ? '提交中...' : '立即结算'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="bg-gray-50 min-h-screen">
          <Routes>
            <Route path="/" element={<Menu />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
