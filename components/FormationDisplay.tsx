
import React from 'react';
import { Team, PlayerInTeam, PlayerPosition } from '../types';
import StarRating from './StarRating'; // Import StarRating

interface PlayerMarkerProps {
  player: PlayerInTeam;
}

const PlayerMarker: React.FC<PlayerMarkerProps> = ({ player }) => {
  const positionAbbreviation: Record<PlayerPosition, string> = {
    [PlayerPosition.FW]: 'FW',
    [PlayerPosition.MID]: 'MF',
    [PlayerPosition.DF]: 'DF',
  };
  const positionColor: Record<PlayerPosition, string> = {
    [PlayerPosition.FW]: 'bg-red-600',
    [PlayerPosition.MID]: 'bg-sky-600',
    [PlayerPosition.DF]: 'bg-emerald-600',
  }

  return (
    <div className="flex flex-col items-center mx-px text-center" aria-label={`Player ${player.name}, Rating ${player.rating}, playing as ${player.assignedPositionOnTeam}`}>
      <StarRating rating={player.rating} size="sm" />
      <div
        className={`mt-0.5 w-8 h-8 ${positionColor[player.assignedPositionOnTeam]} rounded-full flex items-center justify-center text-white font-bold text-[0.6rem] shadow-md border border-slate-900/30`}
        title={`${player.name} - ${player.assignedPositionOnTeam}`}
      >
        {positionAbbreviation[player.assignedPositionOnTeam]}
      </div>
      <span className="mt-0.5 text-[0.65rem] text-slate-100 w-14 break-words leading-tight" title={player.name}>
        {player.name}
      </span>
    </div>
  );
};

interface FormationDisplayProps {
  team: Team;
}

const FormationDisplay: React.FC<FormationDisplayProps> = ({ team }) => {
  const defenders = team.players.filter(p => p.assignedPositionOnTeam === PlayerPosition.DF);
  const midfielders = team.players.filter(p => p.assignedPositionOnTeam === PlayerPosition.MID);
  const forwards = team.players.filter(p => p.assignedPositionOnTeam === PlayerPosition.FW);

  const sortByName = (a: PlayerInTeam, b: PlayerInTeam) => a.name.localeCompare(b.name);
  defenders.sort(sortByName);
  midfielders.sort(sortByName);
  forwards.sort(sortByName);

  return (
    <div className="bg-green-700/60 p-1 rounded relative aspect-[4/3] flex flex-col justify-around items-center min-h-[160px] shadow-inner border border-green-800/30 overflow-hidden">
      {/* Pitch Lines - Simplified & Scaled */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/10"></div>
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/10 rounded-full"></div> {/* Center spot */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-6 border border-white/10 rounded-b-full border-t-0"></div> {/* Center circle arc top */}
        
        {/* Penalty Area & Goal Area */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[60%] h-[30%] border border-white/10 border-b-0 rounded-t-md"></div> {/* Penalty area outline */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[30%] h-[15%] border border-white/10 border-b-0 rounded-t-sm"></div> {/* Goal area (6-yard box) outline */}
        
        {/* Penalty Spot */}
        <div className="absolute bottom-[32%] left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white/10 rounded-full"></div>
        
        {/* Goal Frame */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[25%] h-[8%] border-2 border-white/30 border-b-0 bg-slate-800/20 rounded-t-sm flex items-center justify-center">
            {/* Optional: could add net pattern or "GOAL" text here if desired and space allows */}
        </div>
      </div>

      <div className="flex justify-center w-full z-10">
        {forwards.map(player => <PlayerMarker key={player.id} player={player} />)}
      </div>
      <div className="flex justify-around w-full z-10">
        {midfielders.map(player => <PlayerMarker key={player.id} player={player} />)}
      </div>
      <div className="flex justify-around w-full z-10">
        {defenders.map(player => <PlayerMarker key={player.id} player={player} />)}
      </div>
    </div>
  );
};

export default FormationDisplay;