
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { FlightPrice, MonitorCurrency } from '../types';

interface PriceHistoryChartProps {
  history: FlightPrice[];
  currencyType: MonitorCurrency;
}

const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({ history, currencyType }) => {
  const isPoints = currencyType === 'POINTS';

  const formattedData = React.useMemo(() => {
    const timePoints: number[] = Array.from(new Set(history.map(h => h.timestamp))).sort((a, b) => a - b);
    return timePoints.map(t => {
      const entry: any = { time: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      history.filter(h => h.timestamp === t).forEach(h => {
        entry[h.airline] = h.price;
      });
      return entry;
    });
  }, [history]);

  const currencyFormatter = (value: number) => {
    if (isPoints) return `${value.toLocaleString('pt-BR')} pts`;
    return `R$ ${value.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const tooltipFormatter = (value: number) => {
    const formatted = isPoints 
      ? `${value.toLocaleString('pt-BR')} pts`
      : `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    return [formatted, 'Valor'];
  };

  if (history.length === 0) return <div className="h-40 flex items-center justify-center text-gray-400 text-[10px] font-bold uppercase tracking-widest italic">Sem dados históricos</div>;

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="time" 
            fontSize={8} 
            tick={{ fill: '#94a3b8', fontWeight: 700 }} 
            axisLine={{ stroke: '#f1f5f9' }}
            tickLine={false}
          />
          <YAxis 
            fontSize={8} 
            tick={{ fill: '#94a3b8', fontWeight: 700 }} 
            tickFormatter={currencyFormatter}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: 'none', 
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              fontSize: '10px',
              fontWeight: 'bold',
              padding: '8px 12px'
            }}
            formatter={tooltipFormatter}
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            height={25}
            iconType="circle" 
            iconSize={6}
            wrapperStyle={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase' }} 
          />
          <Line 
            type="monotone" 
            name="LATAM"
            dataKey="LATAM" 
            stroke="#e11d48" 
            strokeWidth={2} 
            dot={{ r: 2, fill: '#e11d48' }} 
            activeDot={{ r: 4 }}
            connectNulls
          />
          <Line 
            type="monotone" 
            name="GOL"
            dataKey="GOL" 
            stroke="#ea580c" 
            strokeWidth={2} 
            dot={{ r: 2, fill: '#ea580c' }} 
            activeDot={{ r: 4 }}
            connectNulls
          />
          <Line 
            type="monotone" 
            name="AZUL"
            dataKey="AZUL" 
            stroke="#2563eb" 
            strokeWidth={2} 
            dot={{ r: 2, fill: '#2563eb' }} 
            activeDot={{ r: 4 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceHistoryChart;
