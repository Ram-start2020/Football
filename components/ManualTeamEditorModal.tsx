
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Player, PlayerPosition, Team, PlayerInTeam } from '../types';

interface ManualTeamEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (editedTeams: Team[]) => void;
  initialTeams: Team[];
  draftablePlayers: Player[];
  teamSize: number;
  teamNames: string[];
}

const ManualTeamEditorModal: React.FC<ManualTeamEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTeams,
  draftablePlayers,
  teamSize,
  teamNames,
}) => {
  const [editedTeams, setEditedTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);

  const initializeTeams = useCallback(() => {
    let teamsToEdit: Team[];
    if (initialTeams && initialTeams.length === teamNames.length && initialTeams.every(t => t.players)) {
      teamsToEdit = JSON.parse(JSON.stringify(initialTeams));
      teamsToEdit.forEach(team => {
        while (team.players.length < teamSize) {
          // @ts-ignore
          team.players.push(null); 
        }
        team.players = team.players.map(p => p ? ({...p, assignedPositionOnTeam: p.assignedPositionOnTeam || p.positions?.[0] || PlayerPosition.MID }) : null) as any[];
      });
    } else {
      teamsToEdit = teamNames.map(name => ({
        name,
        // @ts-ignore
        players: Array(teamSize).fill(null).map(() => (null as PlayerInTeam | null)), 
      }));
    }
    setEditedTeams(teamsToEdit);
  }, [initialTeams, teamNames, teamSize]);

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

  const handlePlayerChange = (teamIndex: number, slotIndex: number, playerId: string) => {
    setError(null); 
    const newEditedTeams = JSON.parse(JSON.stringify(editedTeams)) as Team[];
    const playerToAssign = draftablePlayers.find(p => p.id === playerId);

    if (!playerToAssign) return;

    // Remove player from any other slot they might be in
    for (let tIdx = 0; tIdx < newEditedTeams.length; tIdx++) {
      for (let sIdx = 0; sIdx < newEditedTeams[tIdx].players.length; sIdx++) {
        if (newEditedTeams[tIdx].players[sIdx]?.id === playerId) {
          // If it's not the current slot being targeted, clear it
          if (tIdx !== teamIndex || sIdx !== slotIndex) {
            // @ts-ignore
            newEditedTeams[tIdx].players[sIdx] = null;
          }
        }
      }
    }
    
    // Assign player to the target slot
    newEditedTeams[teamIndex].players[slotIndex] = {
      ...playerToAssign,
      assignedPositionOnTeam: playerToAssign.positions[0] || PlayerPosition.MID, // Default position
    } as PlayerInTeam;

    setEditedTeams(newEditedTeams);
  };

  const handlePositionChange = (teamIndex: number, slotIndex: number, position: PlayerPosition) => {
    const newEditedTeams = JSON.parse(JSON.stringify(editedTeams)) as Team[];
    const playerInSlot = newEditedTeams[teamIndex].players[slotIndex];
    if (playerInSlot) {
      playerInSlot.assignedPositionOnTeam = position;
      setEditedTeams(newEditedTeams);
    }
  };

  const handleSaveClick = () => {
    setError(null);
    const finalTeams: Team[] = [];
    const allAssignedPlayerIdsInSave = new Set<string>(); // Renamed to avoid conflict with outer scope
    let totalAssignedCount = 0;

    for (const team of editedTeams) {
      const currentTeamPlayers: PlayerInTeam[] = [];
      if (team.players.length !== teamSize) {
        setError(`Team ${team.name} must have exactly ${teamSize} players.`);
        return;
      }
      for (const player of team.players) {
        if (!player || !player.id || !player.assignedPositionOnTeam) {
          setError(`All slots in Team ${team.name} must be filled with a player and a position.`);
          return;
        }
        if (allAssignedPlayerIdsInSave.has(player.id)) {
          setError(`Player ${player.name} is assigned multiple times. Each player can only be in one slot.`);
          return;
        }
        allAssignedPlayerIdsInSave.add(player.id);
        currentTeamPlayers.push(player as PlayerInTeam);
        totalAssignedCount++;
      }
      finalTeams.push({ name: team.name, players: currentTeamPlayers });
    }

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

  // This function is not strictly necessary anymore if we use draftablePlayers directly in map,
  // but keeping it in case future filtering logic is needed for a slot.
  const getSelectablePlayersForSlot = (currentTeamIndex: number, currentSlotIndex: number) => {
    return draftablePlayers; 
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-85 flex items-center justify-center p-2 z-[60] overflow-y-auto">
      <div className="bg-slate-800 p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col">
        <h2 className="text-2xl sm:text-3xl font-semibold mb-6 text-sky-400 text-center">Manual Team Editor</h2>
        
        <div className="flex-grow overflow-y-auto pr-2 space-y-6 mb-4">
          {editedTeams.map((team, teamIndex) => (
            <div key={team.name} className="p-3 sm:p-4 bg-slate-700/70 rounded-lg">
              <h3 className="text-xl font-semibold mb-3 text-center text-slate-200 border-b border-slate-600 pb-2">{team.name}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: teamSize }).map((_, slotIndex) => {
                  const playerInSlot = team.players[slotIndex] as PlayerInTeam | null;
                  const selectablePlayers = getSelectablePlayersForSlot(teamIndex, slotIndex);

                  return (
                    <div key={slotIndex} className="p-2 bg-slate-600/50 rounded space-y-2 border border-slate-500/50">
                      <p className="text-xs text-slate-400 font-medium">Slot {slotIndex + 1}</p>
                      <div>
                        <label className="block text-xs text-slate-300 mb-0.5">Player</label>
                        <select
                          value={playerInSlot?.id || ''}
                          onChange={(e) => handlePlayerChange(teamIndex, slotIndex, e.target.value)}
                          className="w-full p-2 bg-slate-500 border border-slate-400 rounded-md text-sm text-slate-100 focus:ring-sky-500 focus:border-sky-500"
                          aria-label={`Player for ${team.name} slot ${slotIndex + 1}`}
                        >
                          <option value="" disabled>{playerInSlot ? 'Change Player' : 'Select Player'}</option>
                          {selectablePlayers.map(p => {
                            const suffix = assignedPlayerIds.has(p.id) ? "" : " (unselected)";
                            // If the player is the one currently in this slot, don't show "unselected" suffix,
                            // as they are, by definition, selected for this slot.
                            const displayName = (playerInSlot?.id === p.id) ? p.name : `${p.name}${suffix}`;
                             return (
                                <option key={p.id} value={p.id}>{displayName} (R: {p.rating})</option>
                             );
                          })}
                        </select>
                      </div>
                      {playerInSlot && (
                        <div>
                          <label className="block text-xs text-slate-300 mb-0.5">Assigned Position</label>
                          <select
                            value={playerInSlot.assignedPositionOnTeam}
                            onChange={(e) => handlePositionChange(teamIndex, slotIndex, e.target.value as PlayerPosition)}
                            className="w-full p-2 bg-slate-500 border border-slate-400 rounded-md text-sm text-slate-100 focus:ring-sky-500 focus:border-sky-500"
                            aria-label={`Position for ${playerInSlot.name} in ${team.name}`}
                          >
                            {Object.values(PlayerPosition).map(pos => (
                              <option key={pos} value={pos}>{pos}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {!playerInSlot && <div className="h-[52px]"></div> /* Placeholder for position select height */}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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
