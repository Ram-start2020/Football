import React, { useState, useMemo } from 'react';
import { Match, Team, MatchPlayCardProps, Player, GoalEvent } from '../types';

interface AddGoalFormProps {
    team: Team;
    onAddGoal: (scorerId: string | null, assisterId: string | null) => void;
    onCancel: () => void;
}

const AddGoalForm: React.FC<AddGoalFormProps> = ({ team, onAddGoal, onCancel }) => {
    const [scorerId, setScorerId] = useState<string | null>(null);
    const [assisterId, setAssisterId] = useState<string | null>(null);
    
    const availableAssisters = useMemo(() => {
        return team.players.filter(p => p.id !== scorerId);
    }, [team.players, scorerId]);

    const handleConfirm = () => {
        onAddGoal(scorerId, assisterId);
    };

    return (
        <div className="bg-slate-700/50 p-3 mt-2 rounded-lg space-y-3 border border-slate-600">
            <h5 className="text-sm font-semibold text-slate-300 text-center">Log New Goal</h5>
            <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Scorer</label>
                <select 
                    value={scorerId === null ? 'own-goal' : scorerId || ''} 
                    onChange={e => setScorerId(e.target.value === 'own-goal' ? null : e.target.value)}
                    className="w-full p-2 bg-slate-600 border border-slate-500 rounded-md text-sm"
                >
                    <option value="" disabled>Select scorer...</option>
                    <option value="own-goal">Own Goal</option>
                    {team.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assist (optional)</label>
                <select
                    value={assisterId || ''}
                    onChange={e => setAssisterId(e.target.value || null)}
                    className="w-full p-2 bg-slate-600 border border-slate-500 rounded-md text-sm"
                    disabled={!scorerId || availableAssisters.length === 0}
                >
                    <option value="">No assist</option>
                    {availableAssisters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
            <div className="flex justify-end space-x-2 pt-1">
                <button onClick={onCancel} className="px-3 py-1 text-xs bg-slate-500 hover:bg-slate-400 rounded-md">Cancel</button>
                <button onClick={handleConfirm} className="px-3 py-1 text-xs bg-sky-600 hover:bg-sky-500 rounded-md font-semibold">Confirm Goal</button>
            </div>
        </div>
    );
};


const MatchPlayCard: React.FC<MatchPlayCardProps> = ({ match, teams, onAddGoal, onRemoveGoal, isFinalized }) => {
  const [addingGoalFor, setAddingGoalFor] = useState<string | null>(null);

  const team1 = teams.find(t => t.name === match.team1Name);
  const team2 = teams.find(t => t.name === match.team2Name);

  const playerMap = useMemo(() => {
    const map = new Map<string, Player>();
    teams.forEach(team => team.players.forEach(p => map.set(p.id, p)));
    return map;
  }, [teams]);

  if (!team1 || !team2) {
    return <div className="bg-slate-800 p-4 rounded-lg shadow-md text-red-400">Error: Team data missing for this match.</div>;
  }
  
  const teamNameColor: Record<string, string> = {
    'Team Alpha': 'text-sky-400',
    'Team Bravo': 'text-white',
    'Team Charlie': 'text-[#FFF700]',
  }

  const handleAddNewGoal = (teamName: string, scorerId: string | null, assisterId: string | null) => {
    onAddGoal(match.id, teamName, scorerId, assisterId);
    setAddingGoalFor(null);
  };
  
  const renderGoalList = (team: Team) => {
      const teamGoals = match.goalEvents.filter(g => g.teamName === team.name);
      if(teamGoals.length === 0) return null;

      return (
          <div className="mt-3 space-y-1.5 text-xs">
              {teamGoals.map(goal => (
                  <div key={goal.id} className="flex items-center justify-between bg-slate-700/40 p-1.5 rounded">
                      <p className="text-slate-300">
                          <span className="font-semibold text-sky-400">Goal:</span> {goal.scorerId ? playerMap.get(goal.scorerId)?.name : 'Own Goal'}
                          {goal.assisterId && <span className="text-slate-400"> (<span className="font-semibold text-purple-400">A:</span> {playerMap.get(goal.assisterId)?.name})</span>}
                      </p>
                      {!isFinalized && (
                          <button onClick={() => onRemoveGoal(match.id, goal.id)} className="text-red-500 hover:text-red-400 font-bold text-sm leading-none px-1.5 py-0.5 rounded">&times;</button>
                      )}
                  </div>
              ))}
          </div>
      );
  }

  return (
    <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700 flex flex-col">
      <div className="flex justify-around items-center mb-2">
        <h4 className={`text-lg font-semibold text-center truncate w-2/5 ${teamNameColor[team1.name] || 'text-slate-300'}`}>
          {team1.name}
        </h4>
        <p className="text-center text-slate-400 text-lg font-light">vs</p>
        <h4 className={`text-lg font-semibold text-center truncate w-2/5 ${teamNameColor[team2.name] || 'text-slate-300'}`}>
          {team2.name}
        </h4>
      </div>
      
      <div className="flex justify-around items-center bg-slate-900/50 p-3 rounded-lg">
        <p className={`text-4xl font-bold ${teamNameColor[team1.name] || 'text-slate-100'}`}>{match.team1Score ?? 0}</p>
        <span className="text-slate-500 text-3xl">:</span>
        <p className={`text-4xl font-bold ${teamNameColor[team2.name] || 'text-slate-100'}`}>{match.team2Score ?? 0}</p>
      </div>
       {isFinalized && match.team1Score !== null && match.team2Score !== null && (
        <p className="text-center mt-3 text-sm font-medium text-slate-300">
          {match.team1Score > match.team2Score ? `${team1.name} wins!` : match.team2Score > match.team1Score ? `${team2.name} wins!` : "It's a Draw"}
        </p>
      )}

      {!isFinalized && (
        <div className="mt-4 flex-grow">
          {/* Team 1 Section */}
          <div className="mb-2">
              {addingGoalFor !== team1.name ? (
                  <button onClick={() => setAddingGoalFor(team1.name)} className="w-full py-1.5 text-xs font-semibold bg-sky-600/50 hover:bg-sky-600/80 rounded-md">Add Goal for {team1.name}</button>
              ) : (
                  <AddGoalForm team={team1} onAddGoal={(s, a) => handleAddNewGoal(team1.name, s, a)} onCancel={() => setAddingGoalFor(null)} />
              )}
              {renderGoalList(team1)}
          </div>
          {/* Team 2 Section */}
          <div>
              {addingGoalFor !== team2.name ? (
                   <button onClick={() => setAddingGoalFor(team2.name)} className="w-full py-1.5 text-xs font-semibold bg-sky-600/50 hover:bg-sky-600/80 rounded-md">Add Goal for {team2.name}</button>
              ) : (
                  <AddGoalForm team={team2} onAddGoal={(s, a) => handleAddNewGoal(team2.name, s, a)} onCancel={() => setAddingGoalFor(null)} />
              )}
              {renderGoalList(team2)}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchPlayCard;