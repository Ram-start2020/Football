import React from 'react';
import { TeamCardProps, PlayerInTeam } from '../types'; // PlayerInTeam for calculateAverageRating
import FormationDisplay from './FormationDisplay'; // New import

const calculateAverageRating = (players: PlayerInTeam[]): string => {
  if (players.length === 0) return 'N/A';
  const totalRating = players.reduce((sum, player) => sum + player.rating, 0);
  return (totalRating / players.length).toFixed(1);
};

const TeamCard: React.FC<TeamCardProps> = ({ team }) => {
  const teamStyles: Record<string, { border: string; bg: string; text: string }> = {
    'Team Alpha': { border: 'border-sky-500', bg: 'bg-sky-600', text: 'text-white' },
    'Team Bravo': { border: 'border-slate-200', bg: 'bg-slate-200', text: 'text-slate-900' },
    'Team Charlie': { border: 'border-yellow-500', bg: 'bg-yellow-500', text: 'text-slate-900' },
  };

  const currentStyle = teamStyles[team.name] || { border: 'border-slate-700', bg: 'bg-slate-700', text: 'text-white' };

  return (
    <div className={`bg-slate-800 rounded-lg shadow-xl overflow-hidden border-t-2 ${currentStyle.border}`}>
      <div className={`p-2 ${currentStyle.bg}`}>
        <h3 className={`text-base font-bold text-center truncate ${currentStyle.text}`}>{team.name}</h3>
        <p className={`text-xs text-center ${currentStyle.text} opacity-80`}>Avg. Rating: {calculateAverageRating(team.players)}</p>
      </div>
      
      <div className="p-1 bg-slate-800/40"> 
        <FormationDisplay team={team} />
      </div>
    </div>
  );
};

export default TeamCard;