
import React, { useState, useEffect } from 'react';
import { Plus, Bell, Plane, Info, AlertCircle, X, Search, RefreshCcw, Coins, Wallet, Zap, Share2 } from 'lucide-react';
import { FlightMonitor, FlightPrice, TripType, MonitorCurrency } from './types';
import { fetchFlightPrices } from './services/geminiService';
import MonitorCard from './components/MonitorCard';

const App: React.FC = () => {
  const [monitors, setMonitors] = useState<FlightMonitor[]>(() => {
    const saved = localStorage.getItem('flight-monitors');
    return saved ? JSON.parse(saved).map((m: any) => ({ ...m, isUpdating: false })) : [];
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Form State
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    date: '',
    returnDate: '',
    tripType: 'one-way' as TripType,
    currencyType: 'BRL' as MonitorCurrency,
    nonStopOnly: true,
    targetPrice: ''
  });

  useEffect(() => {
    const cleanMonitors = monitors.map(({ isUpdating, ...rest }) => rest);
    localStorage.setItem('flight-monitors', JSON.stringify(cleanMonitors));
  }, [monitors]);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      origin: '',
      destination: '',
      date: '',
      returnDate: '',
      tripType: 'one-way',
      currencyType: 'BRL',
      nonStopOnly: true,
      targetPrice: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (monitor: FlightMonitor) => {
    setEditingId(monitor.id);
    setFormData({
      origin: monitor.origin,
      destination: monitor.destination,
      date: monitor.date,
      returnDate: monitor.returnDate || '',
      tripType: monitor.tripType,
      currencyType: monitor.currencyType || 'BRL',
      nonStopOnly: monitor.nonStopOnly,
      targetPrice: monitor.targetPrice.toString()
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.origin || !formData.destination || !formData.date || !formData.targetPrice) return;

    if (editingId) {
      setMonitors(prev => prev.map(m => m.id === editingId ? {
        ...m,
        origin: formData.origin.toUpperCase(),
        destination: formData.destination.toUpperCase(),
        date: formData.date,
        returnDate: formData.tripType === 'round-trip' ? formData.returnDate : undefined,
        tripType: formData.tripType,
        currencyType: formData.currencyType,
        nonStopOnly: formData.nonStopOnly,
        targetPrice: parseFloat(formData.targetPrice),
      } : m));
      setTimeout(() => refreshMonitor(editingId), 100);
    } else {
      const newId = crypto.randomUUID();
      const newMonitor: FlightMonitor = {
        id: newId,
        origin: formData.origin.toUpperCase(),
        destination: formData.destination.toUpperCase(),
        date: formData.date,
        returnDate: formData.tripType === 'round-trip' ? formData.returnDate : undefined,
        tripType: formData.tripType,
        currencyType: formData.currencyType,
        nonStopOnly: formData.nonStopOnly,
        targetPrice: parseFloat(formData.targetPrice),
        isActive: true,
        history: [],
        lastChecked: null,
        isUpdating: false
      };
      setMonitors(prev => [newMonitor, ...prev]);
      setTimeout(() => refreshMonitor(newId), 100);
    }

    setIsModalOpen(false);
  };

  const deleteMonitor = (id: string) => {
    setMonitors(prev => prev.filter(m => m.id !== id));
  };

  const toggleMonitor = (id: string) => {
    setMonitors(prev => prev.map(m => 
      m.id === id ? { ...m, isActive: !m.isActive } : m
    ));
  };

  const refreshMonitor = async (id: string) => {
    setMonitors(prev => prev.map(m => m.id === id ? { ...m, isUpdating: true } : m));

    try {
      const currentTimestamp = Date.now();
      const monitorToUpdate = monitors.find(m => m.id === id);
      if (!monitorToUpdate) return;

      const prices = await fetchFlightPrices({ ...monitorToUpdate, lastChecked: currentTimestamp });
      
      setMonitors(prev => prev.map(m => {
        if (m.id === id) {
          const updatedHistory = [...m.history, ...prices].slice(-60); 
          const matchingPrices = prices.filter(p => p.price <= m.targetPrice);
          
          if (matchingPrices.length > 0 && m.isActive) {
            sendNotification(m, matchingPrices[0]);
          }

          return {
            ...m,
            history: updatedHistory,
            lastChecked: currentTimestamp,
            isUpdating: false
          };
        }
        return m;
      }));
    } catch (error) {
      console.error("Refresh error:", error);
      setMonitors(prev => prev.map(m => m.id === id ? { ...m, isUpdating: false } : m));
    }
  };

  const sendNotification = (monitor: FlightMonitor, offer: FlightPrice) => {
    if (Notification.permission === 'granted') {
      const unit = monitor.currencyType === 'POINTS' ? 'pts' : 'R$';
      const type = offer.isNonStop ? 'DIRETO' : 'COM ESCALAS';
      const n = new Notification('🔥 Preço Alvo Atingido!', {
        body: `${monitor.origin} → ${monitor.destination} por ${offer.price.toLocaleString('pt-BR')} ${unit} na ${offer.airline} (${type})!`,
        icon: 'https://cdn-icons-png.flaticon.com/512/784/784791.png'
      });
      n.onclick = () => window.focus();
    }
  };

  const refreshAll = async () => {
    setIsRefreshing(true);
    for (const monitor of monitors) {
      if (monitor.isActive) {
        await refreshMonitor(monitor.id);
      }
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      refreshAll();
    }, 900000); // 15 mins
    return () => clearInterval(interval);
  }, [monitors]);

  return (
    <div className="min-h-screen pb-20 text-slate-900 bg-slate-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
              <Plane size={24} className="rotate-45" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-gray-900">FlyCheap</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Monitorar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8">
        <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3 text-blue-700 text-sm font-medium">
          <Info size={18} />
          <p>Para o monitoramento continuar ativo, mantenha esta aba aberta. O app busca novos preços a cada 15 minutos.</p>
        </div>

        {notificationPermission !== 'granted' && (
          <button 
            onClick={requestPermission}
            className="w-full mb-8 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-between text-orange-700 hover:bg-orange-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bell size={20} />
              <p className="text-sm font-bold">Ative as notificações para receber alertas de preço!</p>
            </div>
            <span className="text-xs font-black bg-white px-3 py-1 rounded-full border border-orange-200">ATIVAR</span>
          </button>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Seus Alertas</h2>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{monitors.length} trechos ativos</p>
          </div>
          <button 
            disabled={isRefreshing || monitors.length === 0}
            onClick={refreshAll}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest ${isRefreshing ? 'text-gray-300' : 'text-blue-600 hover:text-blue-700'}`}
          >
            <RefreshCcw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Sincronizando...' : 'Atualizar Tudo'}
          </button>
        </div>

        {monitors.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
            <div className="inline-block p-6 bg-blue-50 text-blue-300 rounded-full mb-6 italic">
              <Search size={48} />
            </div>
            <h3 className="text-lg font-black text-gray-800 mb-2 uppercase tracking-tight">Nenhum alerta criado</h3>
            <p className="text-gray-500 max-w-xs mx-auto mb-8 text-sm font-medium">
              Adicione trechos em dinheiro ou milhas e deixe que o FlyCheap faça o trabalho pesado de busca para você.
            </p>
            <button 
              onClick={handleOpenAddModal}
              className="px-8 py-3 bg-blue-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
            >
              Começar Agora
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {monitors.map(monitor => (
              <MonitorCard 
                key={monitor.id} 
                monitor={monitor} 
                onDelete={deleteMonitor} 
                onRefresh={refreshMonitor}
                onToggle={toggleMonitor}
                onEdit={handleOpenEditModal}
              />
            ))}
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-3xl w-full max-w-lg relative shadow-2xl my-8 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">{editingId ? 'Editar Alerta' : 'Novo Alerta de Preço'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, currencyType: 'BRL'})}
                  className={`flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${formData.currencyType === 'BRL' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                >
                  <Wallet size={14} /> Dinheiro
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, currencyType: 'POINTS'})}
                  className={`flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${formData.currencyType === 'POINTS' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
                >
                  <Coins size={14} /> Milhas
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, tripType: 'one-way'})}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${formData.tripType === 'one-way' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                >
                  Só Ida
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, tripType: 'round-trip'})}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${formData.tripType === 'round-trip' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                >
                  Ida e Volta
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Origem (IATA)</label>
                  <input type="text" placeholder="GRU" maxLength={3} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase font-bold text-gray-700" value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Destino (IATA)</label>
                  <input type="text" placeholder="GIG" maxLength={3} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase font-bold text-gray-700" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Data de Ida</label>
                  <input type="date" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-gray-700" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                </div>
                {formData.tripType === 'round-trip' && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Data de Volta</label>
                    <input type="date" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-gray-700" value={formData.returnDate} onChange={e => setFormData({...formData, returnDate: e.target.value})} required />
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                      <Zap size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-700 uppercase leading-none">Apenas Diretos</p>
                      <p className="text-[9px] text-gray-400 mt-0.5">Ignorar voos com escalas</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, nonStopOnly: !formData.nonStopOnly})}
                    className={`w-10 h-5 rounded-full relative transition-all ${formData.nonStopOnly ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.nonStopOnly ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor Alvo ({formData.currencyType === 'POINTS' ? 'Pontos' : 'R$'})</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{formData.currencyType === 'POINTS' ? 'PTS' : 'R$'}</span>
                  <input type="number" placeholder="0" className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-gray-700" value={formData.targetPrice} onChange={e => setFormData({...formData, targetPrice: e.target.value})} required />
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-[0.98]">
                  {editingId ? 'Salvar Alterações' : 'Iniciar Monitoramento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
