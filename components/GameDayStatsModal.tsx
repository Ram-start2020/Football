import React from 'react';

interface TeamStats {
  teamName: string;
  teamColor: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  goalsScored: number;
  goalsConceded: number;
  points: number;
  successRate: string;
  avgGoalsPerGame: string;
  avgGoalsConcededPerGame: string;
}

interface GameDayStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamStats: TeamStats[];
}

const GameDayStatsModal: React.FC<GameDayStatsModalProps> = ({ isOpen, onClose, teamStats }) => {
  const copyToClipboard = () => {
    const statsText = generateStatsText(teamStats);
    navigator.clipboard.writeText(statsText);
  };

  const generateStatsText = (stats: TeamStats[]): string => {
    let text = 'דירוגות קבוצות:\n\n';
    
    stats.forEach((team, index) => {
      text += `${index + 1}. ${team.teamColor} - ${team.points} נקודות\n\n`;
    });

    text += '\nסטטיסטיקות קבוצות בודדות:\n\n';

    stats.forEach((team) => {
      text += `${team.teamColor}\n`;
      text += `ניצחונות: ${team.wins}\n`;
      text += `הפסדים: ${team.losses}\n`;
      text += `משחקים שוחקו: ${team.gamesPlayed}\n`;
      text += `שערים שהבקיעו: ${team.goalsScored}\n`;
      text += `שערים שספגו: ${team.goalsConceded}\n`;
      text += `אחוז הצלחה: ${team.successRate}%\n`;
      text += `ממוצע שערים למשחק: ${team.avgGoalsPerGame}\n`;
      text += `ממוצע שערים שסופגים למשחק: ${team.avgGoalsConcededPerGame}\n\n`;
    });

    return text;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-sky-300">סטטיסטיקות יום משחקים</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-2xl font-bold"
              aria-label="סגור"
            >
              ×
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">דירוגות קבוצות:</h3>
            {teamStats.map((team, index) => (
              <div key={team.teamName} className="text-slate-300 mb-2">
                <span className="font-medium">{index + 1}. {team.teamColor}</span> - {team.points} נקודות
              </div>
            ))}
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">סטטיסטיקות קבוצות בודדות:</h3>
            {teamStats.map((team) => (
              <div key={team.teamName} className="bg-slate-700 rounded p-4 mb-4">
                <h4 className="font-bold text-slate-100 mb-2">{team.teamColor}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-400">ניצחונות:</span> <span className="text-slate-200">{team.wins}</span></div>
                  <div><span className="text-slate-400">הפסדים:</span> <span className="text-slate-200">{team.losses}</span></div>
                  <div><span className="text-slate-400">משחקים שוחקו:</span> <span className="text-slate-200">{team.gamesPlayed}</span></div>
                  <div><span className="text-slate-400">שערים שהבקיעו:</span> <span className="text-slate-200">{team.goalsScored}</span></div>
                  <div><span className="text-slate-400">שערים שספגו:</span> <span className="text-slate-200">{team.goalsConceded}</span></div>
                  <div><span className="text-slate-400">אחוז הצלחה:</span> <span className="text-slate-200">{team.successRate}%</span></div>
                  <div><span className="text-slate-400">ממוצע שערים למשחק:</span> <span className="text-slate-200">{team.avgGoalsPerGame}</span></div>
                  <div><span className="text-slate-400">ממוצע שערים שסופגים למשחק:</span> <span className="text-slate-200">{team.avgGoalsConcededPerGame}</span></div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3 space-x-reverse">
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg transition duration-150"
            >
              העתק ללוח
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg transition duration-150"
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameDayStatsModal;
