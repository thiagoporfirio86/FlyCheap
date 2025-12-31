
import React, { useState, useEffect } from 'react';
import { FlightMonitor } from '../types';
import PriceHistoryChart from './PriceHistoryChart';
import { Trash2, MapPin, Calendar, ArrowRight, RefreshCcw, ExternalLink, Pencil, Repeat, ArrowRightCircle, Loader2, Clock, Ticket, Coins, Zap, Share2 } from 'lucide-react';

interface MonitorCardProps {
  monitor: FlightMonitor;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
  onToggle: (id: string) => void;
  onEdit: (monitor: FlightMonitor) => void;
}

const MonitorCard: React.FC<MonitorCardProps> = ({ monitor, onDelete, onRefresh, onToggle, onEdit }) => {
  const [timeAgo, setTimeAgo] = useState<string>('');

  const latestPrices = monitor.history.filter(h => h.timestamp === monitor.lastChecked);
  const matchingDeals = latestPrices.filter(p => p.price <= monitor.targetPrice);
  const bestOffer = latestPrices.length > 0 
    ? latestPrices.reduce((prev, curr) => (prev.price < curr.price ? prev : curr)) 
    : null;
    
  const isTargetMet = matchingDeals.length > 0;

  const formatDisplayDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    const updateRelativeTime = () => {
      if (!monitor.lastChecked) {
        setTimeAgo('Nunca atualizado');
        return;
      }
      const diff = Date.now() - monitor.lastChecked;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (seconds < 60) setTimeAgo('agora mesmo');
      else if (minutes === 1) setTimeAgo('há 1 minuto');
      else if (minutes < 60) setTimeAgo(`há ${minutes} minutos`);
      else if (hours === 1) setTimeAgo('há 1 hora');
      else setTimeAgo(`há ${hours} horas`);
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 30000);
    return () => clearInterval(interval);
  }, [monitor.lastChecked]);

  const generateSearchUrl = (airline: string) => {
    const { origin, destination, date, returnDate, tripType, currencyType } = monitor;
    const isPoints = currencyType === 'POINTS';
    
    switch (airline.toUpperCase()) {
      case 'LATAM':
        return `https://www.latamairlines.com/br/pt/ofertas-voos?origin=${origin}&destination=${destination}&departure=${date}${returnDate ? `&return=${returnDate}` : ''}&adults=1&cabin=economy&redemption=${isPoints}`;
      case 'GOL':
        if (isPoints) {
          return `https://www.smiles.com.br/emissao-com-milhas?originCode=${origin}&destinationCode=${destination}&departureDate=${new Date(date).getTime()}&adults=1&tripType=${tripType === 'round-trip' ? '2' : '1'}`;
        }
        return `https://b2c.voegol.com.br/compra/busca-parceiro?origem=${origin}&destino=${destination}&dataIda=${date.replace(/-/g, '')}${returnDate ? `&dataVolta=${returnDate.replace(/-/g, '')}` : ''}&ADULTOS=1`;
      case 'AZUL':
        return `https://www.voeazul.com.br/br/pt/home/selecao-voo?origem=${origin}&destino=${destination}&dataIda=${date}${returnDate ? `&dataVolta=${returnDate}` : ''}&adultos=1${isPoints ? '&isPoints=true' : ''}`;
      default:
        return `https://www.google.com/search?q=passagens+${airline}+${origin}+para+${destination}`;
    }
  };

  const handleBookingClick = (deal: any) => {
    const url = (deal.bookingUrl && deal.bookingUrl.includes('http')) 
      ? deal.bookingUrl 
      : generateSearchUrl(deal.airline);
      
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatValue = (val: number) => {
    if (monitor.currencyType === 'POINTS') {
      return `${val.toLocaleString('pt-BR')} pts`;
    }
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border ${isTargetMet ? 'border-green-500 ring-2 ring-green-50' : 'border-gray-100'} overflow-hidden transition-all duration-300 hover:shadow-md relative flex flex-col`}>
      {monitor.isUpdating && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center animate-in fade-in duration-300">
           <Loader2 className="text-blue-600 animate-spin mb-2" size={32} />
           <span className="text-xs font-bold text-blue-700 bg-white/80 px-3 py-1 rounded-full shadow-sm">Buscando na web...</span>
        </div>
      )}

      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${monitor.currencyType === 'POINTS' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
              {monitor.currencyType === 'POINTS' ? <Coins size={20} /> : <MapPin size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2 font-bold text-gray-800">
                <span>{monitor.origin}</span>
                <ArrowRight size={14} className="text-gray-400" />
                <span>{monitor.destination}</span>
              </div>
              <div className="flex flex-wrap gap-x-2 gap-y-1 text-[9px] mt-1">
                <span className="bg-gray-100 px-1.5 py-0.5 rounded font-bold text-gray-500 uppercase">{monitor.tripType === 'round-trip' ? 'Ida/Volta' : 'Só Ida'}</span>
                <span className={`px-1.5 py-0.5 rounded font-bold ${monitor.currencyType === 'POINTS' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                  {monitor.currencyType === 'POINTS' ? 'MILHAS' : 'DINHEIRO'}
                </span>
                <span className="bg-gray-100 px-1.5 py-0.5 rounded font-bold text-gray-500 uppercase">
                  {monitor.nonStopOnly ? 'Apenas Direto' : 'Com Escalas'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => onRefresh(monitor.id)} disabled={monitor.isUpdating} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
              <RefreshCcw size={16} />
            </button>
            <button onClick={() => onEdit(monitor)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
              <Pencil size={16} />
            </button>
            <button onClick={() => onDelete(monitor.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4 text-[11px] text-gray-500 font-medium">
             <div className="flex items-center gap-1.5">
               <Calendar size={13} className="text-gray-400" />
               <span>Ida: <b className="text-gray-700">{formatDisplayDate(monitor.date)}</b></span>
             </div>
             {monitor.tripType === 'round-trip' && monitor.returnDate && (
               <div className="flex items-center gap-1.5">
                 <ArrowRightCircle size={13} className="text-gray-400" />
                 <span>Volta: <b className="text-gray-700">{formatDisplayDate(monitor.returnDate)}</b></span>
               </div>
             )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
            <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold mb-1">Preço Alvo</p>
            <p className={`text-base font-black ${monitor.currencyType === 'POINTS' ? 'text-purple-600' : 'text-blue-600'}`}>{formatValue(monitor.targetPrice)}</p>
          </div>
          <div className={`rounded-xl border p-3 ${isTargetMet ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-100'}`}>
            <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold mb-1">Menor Atual</p>
            <p className={`text-base font-black ${isTargetMet ? 'text-green-700' : 'text-gray-800'}`}>
              {bestOffer ? formatValue(bestOffer.price) : '---'}
            </p>
          </div>
        </div>

        {matchingDeals.length > 0 && (
          <div className="space-y-2 mb-5">
            <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Ticket size={12} /> COMPRAR AGORA:
            </p>
            {matchingDeals.map((deal, idx) => (
              <div key={`${deal.airline}-${idx}`} className="group relative">
                <button 
                  onClick={() => handleBookingClick(deal)}
                  className="flex items-center justify-between w-full py-2.5 px-4 bg-green-600 text-white rounded-xl font-bold text-xs hover:bg-green-700 transition-all shadow-md active:scale-[0.98]"
                >
                  <div className="flex flex-col items-start">
                    <span className="flex items-center gap-2">
                      <ExternalLink size={14} className="opacity-70" />
                      {deal.airline} {monitor.currencyType === 'POINTS' ? (deal.airline === 'GOL' ? '(Smiles)' : deal.airline === 'LATAM' ? '(Pass)' : '(Azul)') : ''}
                    </span>
                    <span className={`text-[8px] uppercase tracking-tighter opacity-80 flex items-center gap-1`}>
                      {deal.isNonStop ? <Zap size={8} className="text-yellow-300" /> : <Share2 size={8} />}
                      {deal.isNonStop ? 'Voo Direto' : 'Com Conexões'}
                    </span>
                  </div>
                  <span>{formatValue(deal.price)}</span>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mb-2">
          <div className="flex justify-between items-center mb-2">
             <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Histórico de Preços</h4>
             {monitor.lastChecked && (
               <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold uppercase">
                 <Clock size={10} />
                 <span>{timeAgo}</span>
               </div>
             )}
          </div>
          <PriceHistoryChart history={monitor.history} currencyType={monitor.currencyType} />
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50/50 border-t border-gray-50">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${monitor.isUpdating ? 'bg-blue-500 animate-pulse' : monitor.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
          <span className="text-[10px] font-black text-gray-500 uppercase">
            {monitor.isUpdating ? 'BUSCANDO' : monitor.isActive ? 'ATIVO' : 'PAUSADO'}
          </span>
        </div>
        <button 
          onClick={() => onToggle(monitor.id)}
          className={`px-4 py-1 rounded-full text-[10px] font-black transition-all ${monitor.isActive ? 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
          {monitor.isActive ? 'PAUSAR' : 'ATIVAR'}
        </button>
      </div>
    </div>
  );
};

export default MonitorCard;
