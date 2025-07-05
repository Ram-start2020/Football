
import React from 'react';
import { PlayerPosition, PositionBadgeProps } from '../types';

const positionColors: Record<PlayerPosition, string> = {
  [PlayerPosition.FW]: 'bg-red-500 hover:bg-red-400',
  [PlayerPosition.MID]: 'bg-blue-500 hover:bg-blue-400',
  [PlayerPosition.DF]: 'bg-green-500 hover:bg-green-400',
};

const positionAbbreviation: Record<PlayerPosition, string> = {
  [PlayerPosition.FW]: 'FWD',
  [PlayerPosition.MID]: 'MID',
  [PlayerPosition.DF]: 'DEF',
};

const PositionBadge: React.FC<PositionBadgeProps> = ({ position }) => {
  return (
    <span 
      className={`text-xs font-medium inline-block px-2.5 py-1 rounded-full text-white transition-colors duration-150 ${positionColors[position]}`}
      title={position}
    >
      {positionAbbreviation[position]}
    </span>
  );
};

export default PositionBadge;