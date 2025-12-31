
export interface FlightPrice {
  airline: 'LATAM' | 'GOL' | 'AZUL';
  price: number;
  timestamp: number;
  currency: string;
  currencyType: 'BRL' | 'POINTS';
  isNonStop: boolean; // Novo: indica se o voo encontrado é direto
  bookingUrl?: string;
}

export type TripType = 'one-way' | 'round-trip';
export type MonitorCurrency = 'BRL' | 'POINTS';

export interface FlightMonitor {
  id: string;
  origin: string;
  destination: string;
  date: string;
  returnDate?: string;
  tripType: TripType;
  currencyType: MonitorCurrency;
  nonStopOnly: boolean;
  targetPrice: number;
  isActive: boolean;
  history: FlightPrice[];
  lastChecked: number | null;
  isUpdating?: boolean;
}

export interface PriceAlert {
  monitorId: string;
  price: number;
  airline: string;
  timestamp: number;
  url?: string;
}
