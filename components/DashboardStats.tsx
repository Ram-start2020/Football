import React from 'react';
import { Player } from '../types';

interface DashboardStatsProps {
  players: Player[];
}

interface StatCategory {
  title: string;
  players: Array<{ player: Player; value: number | string }>;
  valueLabel: string;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ players }) => {
  const calculatePoints = (player: Player): number => {
    const draws = player.gamesPlayed - player.wins - player.losses;
    return player.wins * 3 + draws * 1;
  };

  const calculateGoalsPerGame = (player: Player): number => {
    return player.gamesPlayed > 0 ? player.goals / player.gamesPlayed : 0;
  };

  const calculateAssistsPerGame = (player: Player): number => {
    return player.gamesPlayed > 0 ? player.assists / player.gamesPlayed : 0;
  };

  const getTopPlayers = (
    players: Player[],
    getValue: (p: Player) => number,
    limit: number = 4,
    minGames?: number
  ): Array<{ player: Player; value: number }> => {
    return [...players]
      .map(player => ({ player, value: getValue(player) }))
      .filter(item => item.value > 0 && (minGames === undefined || item.player.gamesPlayed >= minGames))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  };

  const categories: StatCategory[] = [
    {
      title: 'Top Points',
      players: getTopPlayers(players, calculatePoints).map(item => ({
        player: item.player,
        value: item.value
      })),
      valueLabel: 'pts'
    },
    {
      title: 'Top Scorer',
      players: getTopPlayers(players, p => p.goals).map(item => ({
        player: item.player,
        value: item.value
      })),
      valueLabel: 'goals'
    },
    {
      title: 'Top Assists',
      players: getTopPlayers(players, p => p.assists).map(item => ({
        player: item.player,
        value: item.value
      })),
      valueLabel: 'assists'
    },
    {
      title: 'Most Games Played',
      players: getTopPlayers(players, p => p.gamesPlayed).map(item => ({
        player: item.player,
        value: item.value
      })),
      valueLabel: 'games'
    },
    {
      title: 'Goals Per Game',
      players: getTopPlayers(players, calculateGoalsPerGame, 4, 20).map(item => ({
        player: item.player,
        value: item.value.toFixed(2)
      })),
      valueLabel: 'avg'
    },
    {
      title: 'Assists Per Game',
      players: getTopPlayers(players, calculateAssistsPerGame, 4, 20).map(item => ({
        player: item.player,
        value: item.value.toFixed(2)
      })),
      valueLabel: 'avg'
    }
  ];

  return (
    <div className="w-full mb-8">
      <h2 className="text-2xl font-bold text-white mb-4 text-center bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">
        League Statistics
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category, categoryIndex) => (
          <div
            key={categoryIndex}
            className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-slate-700/50"
          >
            <h3 className="text-lg font-semibold text-emerald-400 mb-3 border-b border-slate-700 pb-2">
              {category.title}
            </h3>
            {category.players.length === 0 ? (
              <p className="text-slate-500 text-sm">No data available</p>
            ) : (
              <ul className="space-y-2">
                {category.players.map((item, playerIndex) => (
                  <li
                    key={item.player.id}
                    className={`flex justify-between items-center p-2 rounded-lg ${
                      playerIndex === 0
                        ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30'
                        : 'bg-slate-700/30'
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${
                        playerIndex === 0
                          ? 'text-amber-400 font-bold text-base'
                          : 'text-slate-300'
                      }`}
                    >
                      {playerIndex + 1}. {item.player.name}
                      {playerIndex === 0 && (
                        <span className="ml-2 text-amber-400">👑</span>
                      )}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        playerIndex === 0 ? 'text-amber-300' : 'text-slate-400'
                      }`}
                    >
                      {item.value} {category.valueLabel}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardStats;
