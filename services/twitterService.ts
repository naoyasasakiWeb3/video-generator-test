
import { Trend } from '../types';

export const fetchTrends = async (): Promise<Trend[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { name: '#FutureOfAI', volume: '215K posts' },
        { name: 'Synthwave Comeback', volume: '88.1K posts' },
        { name: '#DigitalNomadLife', volume: '45K posts' },
        { name: 'Retro Gaming', volume: '123K posts' },
        { name: '#SustainableTech', volume: '67K posts' },
      ]);
    }, 1000);
  });
};
