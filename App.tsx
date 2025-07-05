




import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Player, PlayerPosition, Team, Match, PlayerInTeam } from './types';
import { INITIAL_PLAYERS_DATA, REQUIRED_PLAYERS_TOTAL, POSITIONS_PER_TEAM, TOTAL_POSITIONS_NEEDED, TEAM_NAMES, NUM_TEAMS, TEAM_SIZE } from './constants';
import PlayerFormModal from './components/PlayerFormModal';
import TeamCard from './components/TeamCard';
import MatchPlayCard from './components/MatchPlayCard';
import StarRating from './components/StarRating';
import PositionBadge from './components/PositionBadge';
import ManualTeamEditorModal from './components/ManualTeamEditorModal';
import { supabase } from './lib/supabaseClient'; // Import Supabase client
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// Helper function for Fisher-Yates Shuffle
function fisherYatesShuffle<T>(array: T[]): T[] {
  const newArray = [...array]; 
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Sorts players for assignment:
// 1. Prioritizes players with fewer positions (less versatile).
// 2. If equally versatile, prioritizes higher rating (with randomness for tie-breaking).
const sortPlayersForAssignment = (a: Player, b: Player) => {
    const aPositionsCount = a.positions.length;
    const bPositionsCount = b.positions.length;

    if (aPositionsCount !== bPositionsCount) {
        return aPositionsCount - bPositionsCount; // Ascending by number of positions
    }
    const ratingA = a.rating + (Math.random() - 0.5) * 0.01;
    const ratingB = b.rating + (Math.random() - 0.5) * 0.01;
    return ratingB - ratingA;
};

const calculateTeamTotalRating = (team: Team): number => {
  return team.players.reduce((sum, player) => sum + player.rating, 0);
};

const calculateBalanceScore = (teams: Team[]): number => {
  if (!teams || teams.length === 0) return Infinity;
  const teamTotalRatings = teams.map(calculateTeamTotalRating);
  if (teamTotalRatings.length === 0) return Infinity;
  const minRating = Math.min(...teamTotalRatings);
  const maxRating = Math.max(...teamTotalRatings);
  return maxRating - minRating;
};

// Fine-tunes team balance by attempting to swap players in the same assigned position across teams.
function fineTuneTeamBalance(
    teamsToFineTune: Team[],
    maxIterations: number = 300 // Increased iterations for more thorough search
  ): Team[] {
    let currentBestTeams = JSON.parse(JSON.stringify(teamsToFineTune)) as Team[];
    let currentBestBalanceScore = calculateBalanceScore(currentBestTeams);

    if (currentBestTeams.length < 2) return currentBestTeams; // No swaps possible with less than 2 teams

    const allPositions = Object.values(PlayerPosition);

    for (let iter = 0; iter < maxIterations; iter++) {
        // Randomly select two different teams
        const teamIndices = fisherYatesShuffle([...Array(currentBestTeams.length).keys()]);
        const teamAIndex = teamIndices[0];
        const teamBIndex = teamIndices[1];

        const teamA = currentBestTeams[teamAIndex];
        const teamB = currentBestTeams[teamBIndex];

        // Randomly select a position to try swapping
        const posToSwap = allPositions[Math.floor(Math.random() * allPositions.length)];

        const playersInTeamAPos = teamA.players.filter(p => p.assignedPositionOnTeam === posToSwap);
        const playersInTeamBPos = teamB.players.filter(p => p.assignedPositionOnTeam === posToSwap);

        if (playersInTeamAPos.length > 0 && playersInTeamBPos.length > 0) {
            // Select one random player from each team for this position
            const playerAFromTeam = playersInTeamAPos[Math.floor(Math.random() * playersInTeamAPos.length)];
            const playerBFromTeam = playersInTeamBPos[Math.floor(Math.random() * playersInTeamBPos.length)];

            // Find their actual indices in the full player list for the teams
            const playerAOriginalIndex = teamA.players.findIndex(p => p.id === playerAFromTeam.id);
            const playerBOriginalIndex = teamB.players.findIndex(p => p.id === playerBFromTeam.id);

            if (playerAOriginalIndex === -1 || playerBOriginalIndex === -1) continue; // Should not happen

            // Create a temporary copy of teams to test the swap
            const tempTeams = JSON.parse(JSON.stringify(currentBestTeams)) as Team[];
            
            // Perform the swap in the temporary teams
            // Player B moves to Team A, Player A moves to Team B. assignedPositionOnTeam is already correct.
            tempTeams[teamAIndex].players[playerAOriginalIndex] = playerBFromTeam; 
            tempTeams[teamBIndex].players[playerBOriginalIndex] = playerAFromTeam; 

            const newBalanceScore = calculateBalanceScore(tempTeams);

            if (newBalanceScore < currentBestBalanceScore) {
                currentBestTeams = tempTeams; // Keep the swap
                currentBestBalanceScore = newBalanceScore;
            }
        }
    }
    return currentBestTeams;
}


const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  const [teamsConfirmed, setTeamsConfirmed] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [allMatchesFinalized, setAllMatchesFinalized] = useState(false);

  const [showAddMatchForm, setShowAddMatchForm] = useState(false);
  const [selectedTeam1ForNewMatch, setSelectedTeam1ForNewMatch] = useState<string | null>(null);
  const [selectedTeam2ForNewMatch, setSelectedTeam2ForNewMatch] = useState<string | null>(null);
  const [addMatchError, setAddMatchError] = useState<string | null>(null);

  const [isManualEditModalOpen, setIsManualEditModalOpen] = useState(false);
  const [initialTeamsForManualEdit, setInitialTeamsForManualEdit] = useState<Team[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const participatingPlayerCount = useMemo(() => {
    return players.filter(p => p.isIncludedInDraft).length;
  }, [players]);

  const draftablePlayersList = useMemo(() => {
    return players.filter(p => p.isIncludedInDraft);
  }, [players]);

  const showFlashNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const fetchAndMaybeSeedPlayers = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from('players').select('*').order('name', { ascending: true });

      if (error) {
        showFlashNotification('error', `Error fetching players: ${error.message}`);
        setIsLoading(false);
        return;
      }
      
      if (data && data.length > 0) {
        setPlayers(data.map(p => ({
            ...p, 
            isIncludedInDraft: true, 
            // Ensure positions is always an array
            positions: Array.isArray(p.positions) ? p.positions as PlayerPosition[] : [PlayerPosition.MID],
        })));
      } else {
        showFlashNotification('info', 'No players found. Seeding database with initial data...');
        const { error: seedError } = await supabase.from('players').insert(INITIAL_PLAYERS_DATA);

        if (seedError) {
            showFlashNotification('error', `Failed to seed database: ${seedError.message}`);
        } else {
            const { data: newData, error: newError } = await supabase.from('players').select('*').order('name', { ascending: true });
            if (newData) {
                setPlayers(newData.map(p => ({...p, isIncludedInDraft: true, positions: p.positions as PlayerPosition[]})));
                showFlashNotification('success', 'Database seeded successfully!');
            }
            if (newError) {
                 showFlashNotification('error', `Error fetching players after seed: ${newError.message}`);
            }
        }
      }
      setIsLoading(false);
    };
    
    // Check if Supabase is configured in config.ts before fetching
    if(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
        fetchAndMaybeSeedPlayers();
    } else {
        showFlashNotification('error', 'Supabase not configured. Please update config.ts. Player data will not be saved.');
        setIsLoading(false);
    }
  }, []); 

  const handleOpenAddPlayerModal = () => {
    setEditingPlayer(null);
    setShowPlayerForm(true);
  };

  const handleOpenEditPlayerModal = (player: Player) => {
    setEditingPlayer(player);
    setShowPlayerForm(true);
  };

  const handleModalClose = () => {
    setShowPlayerForm(false);
    setEditingPlayer(null); 
  };
  
  const handleSavePlayerFromModal = useCallback(async (playerData: Omit<Player, 'id' | 'wins' | 'losses' | 'isIncludedInDraft' | 'goals' | 'assists'>, editingId?: string) => {
    const playerRecord = {
        name: playerData.name.trim(),
        rating: playerData.rating,
        positions: playerData.positions,
    };

    if (editingId) { 
      const { data, error } = await supabase.from('players').update(playerRecord).eq('id', editingId).select();
      if (error) {
          showFlashNotification('error', `Failed to update player: ${error.message}`);
          return;
      }
      if (data) {
          const updatedPlayer = { ...data[0], isIncludedInDraft: players.find(p => p.id === editingId)?.isIncludedInDraft ?? true };
          setPlayers(prev => prev.map(p => p.id === editingId ? updatedPlayer : p).sort((a,b) => a.name.localeCompare(b.name)));
          showFlashNotification('success', `${playerRecord.name} updated successfully.`);
      }
    } else { 
      const { data, error } = await supabase.from('players').insert(playerRecord).select();
      if (error) {
          showFlashNotification('error', `Failed to add player: ${error.message}`);
          return;
      }
      if (data) {
          const newPlayer: Player = { ...data[0], isIncludedInDraft: true };
          setPlayers(prev => [...prev, newPlayer].sort((a,b) => a.name.localeCompare(b.name)));
          showFlashNotification('success', `${newPlayer.name} added to the roster.`);
      }
    }
    handleModalClose();
  }, [players]);
  
  const handleDeletePlayer = useCallback(async (playerId: string) => {
    if (teams.length > 0) {
      showFlashNotification('error', "Cannot delete players while teams are formed/confirmed. Clear teams first.");
      return;
    }
    const { error } = await supabase.from('players').delete().eq('id', playerId);
    if (error) {
        showFlashNotification('error', `Failed to delete player: ${error.message}`);
    } else {
        setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== playerId));
        showFlashNotification('info', "Player removed from roster.");
    }
  }, [teams]);

  const handleTogglePlayerDraftInclusion = useCallback((playerId: string) => {
    if (teams.length > 0) {
        showFlashNotification('info', "Draft selection cannot be changed while teams are formed. Clear teams first.");
        return;
    }
    setPlayers(prevPlayers => 
        prevPlayers.map(p => 
            p.id === playerId ? { ...p, isIncludedInDraft: !p.isIncludedInDraft } : p
        )
    );
  }, [teams.length]);

  const generateTeams = useCallback(() => {
    const currentDraftablePlayers = players.filter(p => p.isIncludedInDraft);

    if (currentDraftablePlayers.length !== REQUIRED_PLAYERS_TOTAL) {
      showFlashNotification('error', `Please select exactly ${REQUIRED_PLAYERS_TOTAL} players for the draft. Currently ${currentDraftablePlayers.length} selected.`);
      return;
    }

    const uniquePlayersPerPosition: Record<PlayerPosition, Set<string>> = {
        [PlayerPosition.DF]: new Set(),
        [PlayerPosition.MID]: new Set(),
        [PlayerPosition.FW]: new Set(),
    };
    currentDraftablePlayers.forEach(player => {
        player.positions.forEach(pos => {
            uniquePlayersPerPosition[pos].add(player.id);
        });
    });

    for (const pos of Object.values(PlayerPosition)) {
        if (uniquePlayersPerPosition[pos].size < TOTAL_POSITIONS_NEEDED[pos]) {
            showFlashNotification('error', `Not enough unique players capable of playing ${pos}. Need ${TOTAL_POSITIONS_NEEDED[pos]}, but only ${uniquePlayersPerPosition[pos].size} available. Adjust player positions or draft selection.`);
            return;
        }
    }
    
    const positionScarcityData = (Object.values(PlayerPosition) as PlayerPosition[]).map(posKey => ({
        pos: posKey,
        scarcity: uniquePlayersPerPosition[posKey].size / (TOTAL_POSITIONS_NEEDED[posKey] || 1) 
    })).sort((a, b) => a.scarcity - b.scarcity); 

    const dynamicPositionFillOrder = positionScarcityData.map(item => item.pos);

    const MAX_ATTEMPTS = 50; 
    let bestGeneratedTeams: Team[] | null = null;
    let bestBalanceScore = Infinity;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        let assignablePlayersThisAttempt = fisherYatesShuffle(currentDraftablePlayers); 

        const fwPool = assignablePlayersThisAttempt.filter(p => p.positions.includes(PlayerPosition.FW)).sort(sortPlayersForAssignment);
        const midPool = assignablePlayersThisAttempt.filter(p => p.positions.includes(PlayerPosition.MID)).sort(sortPlayersForAssignment);
        const dfPool = assignablePlayersThisAttempt.filter(p => p.positions.includes(PlayerPosition.DF)).sort(sortPlayersForAssignment);

        const newTeamsProtoThisAttempt: Team[] = TEAM_NAMES.map(name => ({ name, players: [] as PlayerInTeam[] }));
        const assignedPlayerIdsThisAttempt = new Set<string>();
        let currentAttemptFailed = false;
        
        for (const currentPosToFill of dynamicPositionFillOrder) {
            if (currentAttemptFailed) break;
            const numSlotsPerTeamForPos = POSITIONS_PER_TEAM[currentPosToFill];
            let playerPoolForCurrentPos: Player[];

            if (currentPosToFill === PlayerPosition.FW) playerPoolForCurrentPos = fwPool;
            else if (currentPosToFill === PlayerPosition.MID) playerPoolForCurrentPos = midPool;
            else playerPoolForCurrentPos = dfPool;

            for (let slotIndex = 0; slotIndex < numSlotsPerTeamForPos; slotIndex++) {
                if (currentAttemptFailed) break;
                for (let teamIdx = 0; teamIdx < NUM_TEAMS; teamIdx++) {
                    if (currentAttemptFailed) break;
                    const team = newTeamsProtoThisAttempt[teamIdx];
                    let playerAssignedToSlot = false;
                    
                    for (const player of playerPoolForCurrentPos) {
                        if (!assignedPlayerIdsThisAttempt.has(player.id)) {
                            team.players.push({ ...player, assignedPositionOnTeam: currentPosToFill });
                            assignedPlayerIdsThisAttempt.add(player.id);
                            playerAssignedToSlot = true;
                            break; 
                        }
                    }
                    if (!playerAssignedToSlot) {
                        currentAttemptFailed = true;
                    }
                }
            }
        }
        
        if (currentAttemptFailed || assignedPlayerIdsThisAttempt.size !== REQUIRED_PLAYERS_TOTAL) {
            continue; 
        }
        
        const currentBalanceScore = calculateBalanceScore(newTeamsProtoThisAttempt);
        if (currentBalanceScore < bestBalanceScore) {
            bestBalanceScore = currentBalanceScore;
            bestGeneratedTeams = newTeamsProtoThisAttempt;
        }
    }

    if (bestGeneratedTeams) {
        bestGeneratedTeams = fineTuneTeamBalance(bestGeneratedTeams);
        bestBalanceScore = calculateBalanceScore(bestGeneratedTeams); 

        bestGeneratedTeams.forEach(team => {
            team.players = fisherYatesShuffle(team.players); 
        });
        setTeams(bestGeneratedTeams);
        setTeamsConfirmed(false);
        setMatches([]);
        setAllMatchesFinalized(false);
        setShowAddMatchForm(false);
        setSelectedTeam1ForNewMatch(null);
        setSelectedTeam2ForNewMatch(null);
        setAddMatchError(null);
        showFlashNotification('success', `Team proposals generated! (Balance Score: ${bestBalanceScore.toFixed(0)})`);
    } else {
        showFlashNotification('error', `Could not generate balanced teams after ${MAX_ATTEMPTS} attempts. The selected players might not cover all team position needs adequately, or the combination is too constrained. Review player positions, draft selection, or try manual edit.`);
        setTeams([]); 
    }
  }, [players, participatingPlayerCount]); 

  const handleConfirmTeams = useCallback(() => {
    if (teams.length !== NUM_TEAMS) {
      showFlashNotification('error', 'Cannot confirm: Teams not generated correctly.');
      return;
    }
    setTeamsConfirmed(true);
    setMatches([]); 
    setAllMatchesFinalized(false);
    setShowAddMatchForm(false); 
    setSelectedTeam1ForNewMatch(null);
    setSelectedTeam2ForNewMatch(null);
    showFlashNotification('info', 'Teams confirmed! Add matches below.');
  }, [teams]);

  const handleAddMatchClick = () => {
    setSelectedTeam1ForNewMatch(TEAM_NAMES[0]); 
    setSelectedTeam2ForNewMatch(TEAM_NAMES[1] !== TEAM_NAMES[0] ? TEAM_NAMES[1] : TEAM_NAMES[2]); 
    setAddMatchError(null);
    setShowAddMatchForm(true);
  };

  const handleCreateMatch = () => {
    setAddMatchError(null);
    if (!selectedTeam1ForNewMatch || !selectedTeam2ForNewMatch) {
      setAddMatchError("Please select two teams.");
      return;
    }
    if (selectedTeam1ForNewMatch === selectedTeam2ForNewMatch) {
      setAddMatchError("A team cannot play against itself.");
      return;
    }

    const newMatch: Match = {
      id: `match-${crypto.randomUUID()}`,
      team1Name: selectedTeam1ForNewMatch,
      team2Name: selectedTeam2ForNewMatch,
      team1Score: 0,
      team2Score: 0,
      goalEvents: [],
    };
    setMatches(prevMatches => [...prevMatches, newMatch]);
    showFlashNotification('success', `Match added: ${selectedTeam1ForNewMatch} vs ${selectedTeam2ForNewMatch}.`);
    setShowAddMatchForm(false);
    setSelectedTeam1ForNewMatch(null);
    setSelectedTeam2ForNewMatch(null);
  };
  
  const handleAddGoal = useCallback((matchId: string, teamName: string, scorerId: string | null, assisterId: string | null) => {
    setMatches(prevMatches => prevMatches.map(m => {
        if (m.id === matchId) {
            const newGoal = { id: crypto.randomUUID(), teamName, scorerId, assisterId };
            const updatedGoalEvents = [...m.goalEvents, newGoal];
            const team1Score = updatedGoalEvents.filter(g => g.teamName === m.team1Name).length;
            const team2Score = updatedGoalEvents.filter(g => g.teamName === m.team2Name).length;
            return { ...m, goalEvents: updatedGoalEvents, team1Score, team2Score };
        }
        return m;
    }));
  }, []);

  const handleRemoveGoal = useCallback((matchId: string, goalId: string) => {
    setMatches(prevMatches => prevMatches.map(m => {
        if (m.id === matchId) {
            const updatedGoalEvents = m.goalEvents.filter(g => g.id !== goalId);
            const team1Score = updatedGoalEvents.filter(g => g.teamName === m.team1Name).length;
            const team2Score = updatedGoalEvents.filter(g => g.teamName === m.team2Name).length;
            return { ...m, goalEvents: updatedGoalEvents, team1Score, team2Score };
        }
        return m;
    }));
  }, []);


  const handleFinalizeGameDay = useCallback(async () => {
    if (matches.length === 0) {
        showFlashNotification('error', 'No matches to finalize. Please add at least one match.');
        return;
    }
    
    const playerUpdates = new Map<string, { wins: number; losses: number; goals: number; assists: number }>();
    players.forEach(p => playerUpdates.set(p.id, { wins: p.wins, losses: p.losses, goals: p.goals, assists: p.assists }));

    matches.forEach(match => {
      const team1 = teams.find(t => t.name === match.team1Name);
      const team2 = teams.find(t => t.name === match.team2Name);

      if (!team1 || !team2 || match.team1Score === null || match.team2Score === null) return;

      const isDraw = match.team1Score === match.team2Score;
      const team1Won = !isDraw && match.team1Score > match.team2Score;
      const team2Won = !isDraw && match.team2Score > match.team1Score;

      team1.players.forEach(pInTeam => { 
        const currentStats = playerUpdates.get(pInTeam.id)!;
        if (team1Won) currentStats.wins += 1;
        else if (team2Won) currentStats.losses += 1;
        playerUpdates.set(pInTeam.id, currentStats);
      });
      team2.players.forEach(pInTeam => { 
        const currentStats = playerUpdates.get(pInTeam.id)!;
        if (team2Won) currentStats.wins += 1;
        else if (team1Won) currentStats.losses += 1;
        playerUpdates.set(pInTeam.id, currentStats);
      });
      
      match.goalEvents.forEach(goal => {
        if(goal.scorerId) {
            const scorerStats = playerUpdates.get(goal.scorerId);
            if(scorerStats) scorerStats.goals += 1;
        }
        if(goal.assisterId) {
            const assisterStats = playerUpdates.get(goal.assisterId);
            if(assisterStats) assisterStats.assists += 1;
        }
      });
    });
    
    const updatedPlayerRecords = players.map(player => {
      const updatedStats = playerUpdates.get(player.id)!;
      return {
        id: player.id,
        name: player.name,
        rating: player.rating,
        positions: player.positions,
        wins: updatedStats.wins,
        losses: updatedStats.losses,
        goals: updatedStats.goals,
        assists: updatedStats.assists,
      };
    });
    const { error } = await supabase.from('players').upsert(updatedPlayerRecords);

    if (error) {
        showFlashNotification('error', `Failed to update player stats: ${error.message}`);
        return;
    }

    setPlayers(prevPlayers => prevPlayers.map(p => {
      const updatedStats = playerUpdates.get(p.id);
      return updatedStats ? { ...p, ...updatedStats } : p;
    }).sort((a,b) => a.name.localeCompare(b.name)));

    setAllMatchesFinalized(true);
    showFlashNotification('success', 'Game day finalized! Player stats updated.');
  }, [matches, teams, players]);

  const clearTeamsAndMatches = useCallback(() => {
    setTeams([]);
    setTeamsConfirmed(false);
    setMatches([]);
    setAllMatchesFinalized(false);
    setShowAddMatchForm(false);
    setSelectedTeam1ForNewMatch(null);
    setSelectedTeam2ForNewMatch(null);
    setAddMatchError(null);
    showFlashNotification('info', 'Teams and matches cleared. Ready for a new game day!');
  }, []);

  const handleOpenManualEdit = () => {
    if (draftablePlayersList.length !== REQUIRED_PLAYERS_TOTAL) {
        showFlashNotification('error', `Manual edit requires exactly ${REQUIRED_PLAYERS_TOTAL} players selected for draft.`);
        return;
    }
    const teamsToEdit = teams.length === NUM_TEAMS 
        ? JSON.parse(JSON.stringify(teams)) 
        : TEAM_NAMES.map(name => ({ name, players: [] as PlayerInTeam[] }));
    
    setInitialTeamsForManualEdit(teamsToEdit);
    setIsManualEditModalOpen(true);
  };

  const handleSaveManualTeams = (manuallyEditedTeams: Team[]) => {
    let totalPlayersInManualTeams = 0;
    for(const team of manuallyEditedTeams) {
        if(team.players.length !== TEAM_SIZE) {
            showFlashNotification('error', `Each team must have exactly ${TEAM_SIZE} players. ${team.name} has ${team.players.length}.`);
            return;
        }
        totalPlayersInManualTeams += team.players.length;
    }

    if (totalPlayersInManualTeams !== REQUIRED_PLAYERS_TOTAL) {
        showFlashNotification('error', `Total players in manual teams must be ${REQUIRED_PLAYERS_TOTAL}. Found ${totalPlayersInManualTeams}.`);
        return;
    }
    const allPlayerIdsInManualTeams = manuallyEditedTeams.flatMap(t => t.players.map(p => p.id));
    if (new Set(allPlayerIdsInManualTeams).size !== REQUIRED_PLAYERS_TOTAL) {
        showFlashNotification('error', `Players must be unique across all teams and all ${REQUIRED_PLAYERS_TOTAL} drafted players must be assigned.`);
        return;
    }

    setTeams(manuallyEditedTeams);
    setTeamsConfirmed(true); 
    setMatches([]);
    setAllMatchesFinalized(false);
    setIsManualEditModalOpen(false);
    showFlashNotification('success', 'Teams manually set and confirmed!');
  };


  const sortedPlayers = [...players].sort((a,b) => a.name.localeCompare(b.name));

  const getButtonClass = (variant: 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'info' | 'neutral' | 'edit', disabled?: boolean, size: 'normal' | 'small' = 'normal') => {
    let base = "font-semibold rounded-lg shadow-md transition duration-150 transform";
     if (size === 'small') {
        base += " py-1.5 px-3 text-xs"; 
    } else {
        base += " w-full py-3 px-6";
    }

    if (disabled) {
        base += " opacity-50 cursor-not-allowed";
    } else {
        base += " hover:shadow-lg hover:scale-105";
    }
    
    switch(variant) {
      case 'primary': return `${base} bg-sky-600 ${!disabled && 'hover:bg-sky-500'} text-white`;
      case 'success': return `${base} bg-emerald-600 ${!disabled && 'hover:bg-emerald-500'} text-white`;
      case 'warning': return `${base} bg-amber-600 ${!disabled && 'hover:bg-amber-500'} text-white`;
      case 'danger': return `${base} bg-red-600 ${!disabled && 'hover:bg-red-500'} text-white`;
      case 'info': return `${base} bg-purple-600 ${!disabled && 'hover:bg-purple-500'} text-white`;
      case 'edit': return `${base} bg-blue-600 ${!disabled && 'hover:bg-blue-500'} text-white`;
      default: return `${base} bg-slate-600 ${!disabled && 'hover:bg-slate-500'} text-white`;
    }
  }
  
  const availableTeamsForNewMatch2 = TEAM_NAMES.filter(name => name !== selectedTeam1ForNewMatch);
  const canGenerateTeams = participatingPlayerCount === REQUIRED_PLAYERS_TOTAL;
  const canManuallyEdit = participatingPlayerCount === REQUIRED_PLAYERS_TOTAL;


  if (isLoading) {
    return (
        <div className="flex flex-col justify-center items-center min-h-screen bg-slate-900 text-slate-100">
            <h1 className="text-4xl font-bold text-sky-400 mb-4 animate-pulse">Soccer Team Balancer</h1>
            <p className="text-lg text-slate-400">Loading player data...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
      {notification && (
        <div className={`fixed top-5 right-5 p-4 rounded-md shadow-lg text-white text-sm z-[100] animate-fadeInOutToast
          ${notification.type === 'success' ? 'bg-green-600' : notification.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}>
          {notification.message}
        </div>
      )}
      <style>{`
        @keyframes fadeInOutToast {
          0% { opacity: 0; transform: translate(100%, -20px); }
          10% { opacity: 1; transform: translate(0, 0); }
          90% { opacity: 1; transform: translate(0, 0); }
          100% { opacity: 0; transform: translate(100%, -20px); }
        }
        .animate-fadeInOutToast { animation: fadeInOutToast 3.5s ease-in-out forwards; }
        .table-responsive-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        @media (max-width: 768px) {
            .player-roster-table th, .player-roster-table td { font-size: 0.8rem; padding: 0.5rem 0.4rem; }
            .player-roster-table .action-button { padding: 0.25rem 0.5rem; font-size: 0.7rem; }
            .player-roster-table .star-column { min-width: 80px; } 
            .player-roster-table .positions-column { min-width: 120px; } 
            .player-roster-table .name-column { min-width: 120px; }
            .player-roster-table .draft-checkbox-column { min-width: 60px; }
        }
        .player-roster-table .positions-column .flex > span:not(:last-child) { margin-right: 0.35rem; } 
        .player-roster-table tr.excluded-from-draft td:not(.actions-column):not(.draft-checkbox-cell) { opacity: 0.6; } 
        .player-roster-table tr.excluded-from-draft .draft-checkbox-cell { opacity: 1; } 
        .draft-checkbox { width: 1.15rem; height: 1.15rem; }
      `}</style>

      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-sky-400">Soccer Team Balancer</h1>
        <p className="text-slate-400 mt-2 text-lg">Manage players, generate fair teams, and track your game day stats!</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        <button onClick={handleOpenAddPlayerModal} className={getButtonClass('primary')}>
          Add New Player
        </button>

        {teams.length === 0 && (
          <div className="relative">
            <button 
              onClick={generateTeams} 
              className={getButtonClass('success', !canGenerateTeams)}
              disabled={!canGenerateTeams}
              title={!canGenerateTeams ? `Select exactly ${REQUIRED_PLAYERS_TOTAL} players for draft` : 'Generate balanced teams'}
            >
              Generate Teams
            </button>
            <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded-full
                             ${participatingPlayerCount === REQUIRED_PLAYERS_TOTAL ? 'bg-emerald-500/80' : 'bg-amber-500/80'} text-white`}>
                Draft: {participatingPlayerCount}/{REQUIRED_PLAYERS_TOTAL}
            </span>
          </div>
        )}
         {teams.length === 0 && ( 
            <button
                onClick={handleOpenManualEdit}
                className={getButtonClass('warning', !canManuallyEdit)}
                disabled={!canManuallyEdit}
                title={!canManuallyEdit ? `Select ${REQUIRED_PLAYERS_TOTAL} players for draft first` : 'Manually create teams'}
            >
                Manual Edit Teams
            </button>
        )}


        {teams.length > 0 && !teamsConfirmed && (
          <>
            <button onClick={handleConfirmTeams} className={getButtonClass('success')}>
              Confirm Teams
            </button>
            <button onClick={generateTeams} className={getButtonClass('warning')}>
              Regenerate Teams
            </button>
             <button
                onClick={handleOpenManualEdit}
                className={getButtonClass('warning')}
                title={'Manually edit proposed teams'}
            >
                Edit Proposed Teams
            </button>
          </>
        )}
        
        {teamsConfirmed && !allMatchesFinalized && (
           <button 
            onClick={handleFinalizeGameDay} 
            className={getButtonClass('info', matches.length === 0)}
            disabled={matches.length === 0}
            title={matches.length === 0 ? "Add matches first" : "Finalize and update stats"}
            >
             Finalize Game Day
           </button>
        )}
        
        {teams.length > 0 && (
           <button onClick={clearTeamsAndMatches} className={getButtonClass('danger')}>
             {allMatchesFinalized || teamsConfirmed ? 'Clear & New Game Day' : 'Clear Teams'}
           </button>
        )}
      </div>

      <PlayerFormModal 
        isOpen={showPlayerForm} 
        onClose={handleModalClose} 
        onSavePlayer={handleSavePlayerFromModal}
        editingPlayer={editingPlayer}
        existingPlayerNames={players.map(p => p.name)}
      />

      {isManualEditModalOpen && (
        <ManualTeamEditorModal
          isOpen={isManualEditModalOpen}
          onClose={() => setIsManualEditModalOpen(false)}
          onSave={handleSaveManualTeams}
          initialTeams={initialTeamsForManualEdit}
          draftablePlayers={draftablePlayersList}
          teamSize={TEAM_SIZE}
          teamNames={TEAM_NAMES}
        />
      )}


      {teams.length > 0 && (
        <section className="mb-10">
          <h2 className="text-3xl font-semibold mb-6 text-center text-sky-300">
            {teamsConfirmed ? "Confirmed Teams" : "Proposed Teams"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(team => (
              <TeamCard key={team.name} team={team} />
            ))}
          </div>
        </section>
      )}

      {teamsConfirmed && (
        <section className="mb-10 p-6 bg-slate-800 rounded-xl shadow-xl">
          <h2 className="text-3xl font-semibold mb-6 text-center text-emerald-300">
            Game Day Matches
          </h2>
          {!allMatchesFinalized && !showAddMatchForm && (
            <div className="mb-6 text-center">
              <button 
                onClick={handleAddMatchClick}
                className={getButtonClass('primary')}
                title="Add a new match pairing"
              >
                Add New Match
              </button>
            </div>
          )}
          {showAddMatchForm && (
            <div className="mb-8 p-6 bg-slate-700 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-sky-400">Create New Match</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                <div>
                  <label htmlFor="team1Select" className="block text-sm font-medium text-slate-300 mb-1">Team 1</label>
                  <select 
                    id="team1Select"
                    value={selectedTeam1ForNewMatch || ''}
                    onChange={(e) => setSelectedTeam1ForNewMatch(e.target.value)}
                    className="w-full p-3 bg-slate-600 border border-slate-500 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-slate-100"
                  >
                    <option value="" disabled>Select Team 1</option>
                    {TEAM_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="team2Select" className="block text-sm font-medium text-slate-300 mb-1">Team 2</label>
                  <select 
                    id="team2Select"
                    value={selectedTeam2ForNewMatch || ''}
                    onChange={(e) => setSelectedTeam2ForNewMatch(e.target.value)}
                    className="w-full p-3 bg-slate-600 border border-slate-500 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-slate-100"
                    disabled={!selectedTeam1ForNewMatch}
                  >
                    <option value="" disabled>Select Team 2</option>
                    {availableTeamsForNewMatch2.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
              </div>
              {addMatchError && <p className="text-red-400 text-sm mb-3">{addMatchError}</p>}
              <div className="flex justify-end space-x-3">
                <button onClick={() => setShowAddMatchForm(false)} className={getButtonClass('neutral', false, 'small')}>Cancel</button>
                <button onClick={handleCreateMatch} className={getButtonClass('success', false, 'small')}>Create Match</button>
              </div>
            </div>
          )}
          {matches.length === 0 && !showAddMatchForm && (
            <p className="text-center text-slate-400 py-4">No matches added yet. Click "Add New Match" to set up games.</p>
          )}
          {matches.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.map(match => (
                <MatchPlayCard 
                  key={match.id} 
                  match={match} 
                  teams={teams} 
                  onAddGoal={handleAddGoal}
                  onRemoveGoal={handleRemoveGoal}
                  isFinalized={allMatchesFinalized}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="bg-slate-800/50 p-4 sm:p-6 rounded-xl shadow-xl">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-semibold text-sky-300">Player Roster ({players.length})</h2>
            {teams.length === 0 && (
                <span className={`text-sm px-3 py-1 rounded-full
                                 ${participatingPlayerCount === REQUIRED_PLAYERS_TOTAL ? 'bg-emerald-600' : 'bg-amber-600'} text-white shadow-md`}>
                    Selected for Draft: {participatingPlayerCount} / {REQUIRED_PLAYERS_TOTAL}
                </span>
            )}
        </div>

        {players.length === 0 ? (
          <p className="text-center text-slate-400 py-4">No players. Add some to get started!</p>
        ) : (
          <div className="table-responsive-wrapper rounded-lg border border-slate-700">
            <table className="w-full min-w-max text-left player-roster-table">
              <thead className="bg-slate-700/80">
                <tr>
                  <th scope="col" className="p-3 text-sm font-semibold text-slate-200 draft-checkbox-column text-center">Draft?</th>
                  <th scope="col" className="p-3 text-sm font-semibold text-slate-200 name-column">Name</th>
                  <th scope="col" className="p-3 text-sm font-semibold text-slate-200 text-center star-column">Rating</th>
                  <th scope="col" className="p-3 text-sm font-semibold text-slate-200 text-center positions-column">Positions</th>
                  <th scope="col" className="p-3 text-sm font-semibold text-slate-200 text-center">Wins/Losses</th>
                  <th scope="col" className="p-3 text-sm font-semibold text-slate-200 text-center">Goals/Assists</th>
                  <th scope="col" className="p-3 text-sm font-semibold text-slate-200 text-right actions-column">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {sortedPlayers.map(player => (
                  <tr 
                    key={player.id} 
                    className={`transition-colors duration-150 ${player.isIncludedInDraft ? 'hover:bg-slate-700/40' : 'excluded-from-draft hover:bg-slate-700/30'}`}
                  >
                    <td className="p-3 text-center draft-checkbox-cell">
                        <input 
                            type="checkbox"
                            className="draft-checkbox accent-sky-500 bg-slate-600 border-slate-500 rounded focus:ring-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
                            checked={player.isIncludedInDraft}
                            onChange={() => handleTogglePlayerDraftInclusion(player.id)}
                            disabled={teams.length > 0}
                            aria-label={`Include ${player.name} in draft`}
                            title={teams.length > 0 ? "Clear teams to change draft status" : (player.isIncludedInDraft ? "Exclude from draft" : "Include in draft")}
                        />
                    </td>
                    <td className="p-3 text-slate-200 name-column whitespace-nowrap">{player.name}</td>
                    <td className="p-3 star-column">
                      <div className="flex justify-center">
                        <StarRating rating={player.rating} size="sm" />
                      </div>
                    </td>
                    <td className="p-3 text-center positions-column">
                      <div className="flex justify-center items-center flex-wrap gap-1">
                        {player.positions.map(pos => <PositionBadge key={pos} position={pos} />)}
                      </div>
                    </td>
                    <td className="p-3 text-center font-medium">
                        <span className="text-green-400">{player.wins}</span>
                        <span className="text-slate-500">/</span>
                        <span className="text-red-400">{player.losses}</span>
                    </td>
                    <td className="p-3 text-center font-medium">
                        <span className="text-sky-400">{player.goals}</span>
                        <span className="text-slate-500">/</span>
                        <span className="text-purple-400">{player.assists}</span>
                    </td>
                    <td className="p-3 text-right actions-column">
                      <div className="flex justify-end space-x-2">
                         <button
                            onClick={() => handleOpenEditPlayerModal(player)}
                            className={getButtonClass('edit', teams.length > 0, 'small') + " action-button"}
                            title={teams.length > 0 ? "Clear teams before editing" : "Edit player"}
                            disabled={teams.length > 0}
                            aria-label={`Edit player ${player.name}`}
                          >
                           Edit
                          </button>
                          <button
                            onClick={() => handleDeletePlayer(player.id)}
                            className={getButtonClass('danger', teams.length > 0, 'small') + " action-button"}
                            title={teams.length > 0 ? "Clear teams before deleting" : "Delete player"}
                            disabled={teams.length > 0}
                            aria-label={`Delete player ${player.name}`}
                          >
                            Delete
                          </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="mt-12 pt-8 border-t border-slate-700 text-center">
        <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} Soccer Team Balancer. App Version 3.4 - Now with Supabase!</p>
      </footer>
    </div>
  );
};

export default App;