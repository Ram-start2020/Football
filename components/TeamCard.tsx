import React from 'react';
import { TeamCardProps, PlayerInTeam } from '../types'; // PlayerInTeam for calculateAverageRating
import FormationDisplay from './FormationDisplay'; // New import

const calculateAverageRating = (players: PlayerInTeam[]): string => {
  if (players.length === 0) return 'N/A';
  const totalRating = players.reduce((sum, player) => sum + player.rating, 0);
  return (totalRating / players.length).toFixed(1);
};

const TeamCard: React.FC<TeamCardProps> = ({ team }) => {
  const teamColorClasses: Record<string, string> = {
    'Team Alpha': 'border-sky-500',
    'Team Bravo': 'border-white',
    'Team Charlie': 'border-[#FFF700]',
  };

  const teamHeaderColorClasses: Record<string, string> = {
    'Team Alpha': 'bg-sky-600',
    'Team Bravo': 'bg-white',
    'Team Charlie': 'bg-[#FFF700]',
  };

  const headerTextIsBlack = team.name === 'Team Bravo' || team.name === 'Team Charlie';

  return (
    <div className={`bg-slate-800 rounded-lg shadow-xl overflow-hidden border-t-2 ${teamColorClasses[team.name] || 'border-slate-700'}`}>
      <div className={`p-2 ${teamHeaderColorClasses[team.name] || 'bg-slate-700'}`}>
        <h3 className={`text-base font-bold text-center truncate ${headerTextIsBlack ? 'text-black' : 'text-white'}`}>
          {team.name}
        </h3>
        <p className={`text-xs text-center ${headerTextIsBlack ? 'text-gray-700' : 'text-slate-200'}`}>
          Avg. Rating: {calculateAverageRating(team.players)}
        </p>
      </div>
      
      <div className="p-1 bg-slate-800/40"> 
        <FormationDisplay team={team} />
      </div>
    </div>
  );
};

export default TeamCard;