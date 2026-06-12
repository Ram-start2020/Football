
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Player, PlayerPosition, Team, PlayerInTeam } from '../types';

interface ManualTeamEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (editedTeams: Team[]) => void;
  initialTeams: Team[];
  draftablePlayers: Player[];
  teamNames: string[];
}

const ManualTeamEditorModal: React.FC<ManualTeamEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTeams,
  draftablePlayers,
  teamNames,
}) => {
  const [editedTeams, setEditedTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);

  const initializeTeams = useCallback(() => {
    let teamsToEdit: Team[];
    if (initialTeams && initialTeams.length === teamNames.length && initialTeams.every(t => t.players)) {
      // Use existing teams if available
      teamsToEdit = JSON.parse(JSON.stringify(initialTeams));
    } else {
      // Create empty teams
      teamsToEdit = teamNames.map(name => ({
        name,
        players: [] as PlayerInTeam[], 
      }));
    }
    setEditedTeams(teamsToEdit);
  }, [initialTeams, teamNames]);

  useEffect(() => {
    if (isOpen) {
      initializeTeams();
      setError(null);
    }
  }, [isOpen, initializeTeams]);
  
  const assignedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    editedTeams.forEach(team => {
        team.players.forEach(player => {
            if (player?.id) {
                ids.add(player.id);
            }
        });
    });
    return ids;
  }, [editedTeams]);

  const unassignedPlayers = useMemo(() => {
    return draftablePlayers.filter(p => !assignedPlayerIds.has(p.id));
  }, [draftablePlayers, assignedPlayerIds]);

  // Handle adding a player to a team
  const handleAddPlayerToTeam = (teamIndex: number, playerId: string) => {
    setError(null);
    const newEditedTeams = JSON.parse(JSON.stringify(editedTeams)) as Team[];
    const playerToAdd = draftablePlayers.find(p => p.id === playerId);

    if (!playerToAdd) return;

    // Remove player from any other team they might be in
    for (let tIdx = 0; tIdx < newEditedTeams.length; tIdx++) {
      newEditedTeams[tIdx].players = newEditedTeams[tIdx].players.filter(p => p.id !== playerId);
    }

    // Add player to target team
    const getPreferredPosition = (p: Player): PlayerPosition => {
      if (p.positions.includes(PlayerPosition.MID)) return PlayerPosition.MID;
      if (p.positions.includes(PlayerPosition.FW)) return PlayerPosition.FW;
      return p.positions[0] || PlayerPosition.DF;
    };

    newEditedTeams[teamIndex].players.push({
      ...playerToAdd,
      assignedPositionOnTeam: getPreferredPosition(playerToAdd),
    } as PlayerInTeam);

    setEditedTeams(newEditedTeams);
  };

  // Handle removing a player from a team
  const handleRemovePlayerFromTeam = (teamIndex: number, playerId: string) => {
    setError(null);
    const newEditedTeams = JSON.parse(JSON.stringify(editedTeams)) as Team[];
    newEditedTeams[teamIndex].players = newEditedTeams[teamIndex].players.filter(p => p.id !== playerId);
    setEditedTeams(newEditedTeams);
  };

  // Handle changing a player's position in a team
  const handlePositionChange = (teamIndex: number, playerId: string, position: PlayerPosition) => {
    const newEditedTeams = JSON.parse(JSON.stringify(editedTeams)) as Team[];
    const playerIndex = newEditedTeams[teamIndex].players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      newEditedTeams[teamIndex].players[playerIndex].assignedPositionOnTeam = position;
      setEditedTeams(newEditedTeams);
    }
  };

  const handleSaveClick = () => {
    setError(null);
    const finalTeams: Team[] = [];
    const allAssignedPlayerIdsInSave = new Set<string>();
    let totalAssignedCount = 0;

    // Validate teams
    for (const team of editedTeams) {
      const currentTeamPlayers: PlayerInTeam[] = [];
      
      // Allow empty teams or teams with any number of players
      for (const player of team.players) {
        if (!player || !player.id || !player.assignedPositionOnTeam) {
          setError(`Invalid player data in Team ${team.name}. All players must have a name and assigned position.`);
          return;
        }
        if (allAssignedPlayerIdsInSave.has(player.id)) {
          setError(`Player ${player.name} is assigned multiple times. Each player can only be in one team.`);
          return;
        }
        allAssignedPlayerIdsInSave.add(player.id);
        currentTeamPlayers.push(player as PlayerInTeam);
        totalAssignedCount++;
      }
      finalTeams.push({ name: team.name, players: currentTeamPlayers });
    }

    // Check that all draftable players are assigned
    if (totalAssignedCount !== draftablePlayers.length) {
         setError(`Not all ${draftablePlayers.length} drafted players have been assigned to a team. Currently ${totalAssignedCount} assigned.`);
         return;
    }
    if (allAssignedPlayerIdsInSave.size !== draftablePlayers.length) {
        setError(`There's a mismatch in assigned players. Expected ${draftablePlayers.length} unique players, found ${allAssignedPlayerIdsInSave.size}.`);
        return;
    }

    onSave(finalTeams);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-85 flex items-center justify-center p-2 z-[60] overflow-y-auto">
      <div className="bg-slate-800 p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] flex flex-col">
        <h2 className="text-2xl sm:text-3xl font-semibold mb-2 text-sky-400 text-center">Manual Team Editor</h2>
        <p className="text-sm text-slate-400 text-center mb-4">Assign players to teams. Teams can have any number of players.</p>
        
        <div className="flex-grow overflow-y-auto pr-2 space-y-4 mb-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Teams Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-300 border-b border-slate-600 pb-2">Teams</h3>
              {editedTeams.map((team, teamIndex) => (
                <div key={team.name} className="p-4 bg-slate-700/70 rounded-lg border border-slate-600">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-slate-100">{team.name}</h4>
                    <span className="text-xs bg-slate-600 px-2 py-1 rounded text-slate-300">
                      {team.players.length} player{team.players.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {team.players.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No players assigned yet</p>
                  ) : (
                    <div className="space-y-2">
                      {team.players.map((player) => (
                        <div key={player.id} className="p-2 bg-slate-600/50 rounded flex items-center justify-between gap-2">
                          <div className="flex-grow">
                            <p className="text-sm text-slate-100 font-medium">{player.name}</p>
                            <p className="text-xs text-slate-400">Rating: {player.rating}</p>
                          </div>
                          <select
                            value={player.assignedPositionOnTeam}
                            onChange={(e) => handlePositionChange(teamIndex, player.id, e.target.value as PlayerPosition)}
                            className="px-2 py-1 bg-slate-500 border border-slate-400 rounded text-xs text-slate-100 focus:ring-sky-500 focus:border-sky-500"
                            aria-label={`Position for ${player.name}`}
                          >
                            {Object.values(PlayerPosition).map(pos => (
                              <option key={pos} value={pos}>{pos}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleRemovePlayerFromTeam(teamIndex, player.id)}
                            className="px-2 py-1 bg-red-600/70 hover:bg-red-600 text-white text-xs rounded transition"
                            title={`Remove ${player.name} from ${team.name}`}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Unassigned Players Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-300 border-b border-slate-600 pb-2">Unassigned Players</h3>
              {unassignedPlayers.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-8 bg-slate-700/50 rounded">
                  All players assigned! ✓
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {unassignedPlayers.map((player) => (
                    <div key={player.id} className="p-3 bg-slate-700/50 rounded border border-slate-600 flex items-center justify-between gap-2">
                      <div className="flex-grow">
                        <p className="text-sm text-slate-100 font-medium">{player.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-slate-400">Rating: {player.rating}</p>
                          <div className="flex gap-1">
                            {player.positions.map(pos => (
                              <span key={pos} className="text-xs bg-slate-600 px-1.5 py-0.5 rounded text-slate-300">
                                {pos}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {editedTeams.map((team, teamIndex) => (
                          <button
                            key={team.name}
                            onClick={() => handleAddPlayerToTeam(teamIndex, player.id)}
                            className="px-2 py-1 bg-sky-600/70 hover:bg-sky-600 text-white text-xs rounded transition whitespace-nowrap"
                            title={`Add ${player.name} to ${team.name}`}
                          >
                            Add to {team.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-100 rounded-md transition duration-150"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveClick}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition duration-150 font-semibold"
          >
            Save Manual Teams
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualTeamEditorModal;
