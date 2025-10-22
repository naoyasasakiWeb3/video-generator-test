
import React from 'react';
import { Trend } from '../types';

interface TrendCardProps {
  trend: Trend;
}

const TrendCard: React.FC<TrendCardProps> = ({ trend }) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 shadow-lg hover:border-indigo-500 transition-colors duration-300">
      <h3 className="text-lg font-bold text-indigo-400">{trend.name}</h3>
      <p className="text-gray-400 text-sm">{trend.volume}</p>
    </div>
  );
};

export default TrendCard;
