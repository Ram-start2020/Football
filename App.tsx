import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { Player, PlayerPosition, Team, Match, PlayerInTeam } from './types';
import { INITIAL_PLAYERS_DATA, TEAM_NAMES, NUM_TEAMS } from './constants';
import PlayerFormModal from './components/PlayerFormModal';
import TeamCard from './components/TeamCard';
import MatchPlayCard from './components/MatchPlayCard';
import StarRating from './components/StarRating';
import PositionBadge from './components/PositionBadge';
import ManualTeamEditorModal from './components/ManualTeamEditorModal';
import AuthModal from './components/AuthModal';
import { supabase } from './lib/supabaseClient'; 
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';
import { Database } from './lib/database.types';
import { Analytics } from '@vercel/analytics/react';

type PlayerRow = Database['public']['Tables']['players']['Row'];
type PlayerInsert = Database['public']['Tables']['players']['Insert'];

// Helper function for Fisher-Yates Shuffle
function fisherYatesShuffle<T>(array: T[]): T[] {
  const newArray = [...array]; 
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}


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
  const [session, setSession] = useState<Session | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [gameDayStats, setGameDayStats] = useState<any>([]);
  const isAdmin = !!session;


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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === 'SIGNED_IN') {
        setShowAuthModal(false);
        showFlashNotification('success', `Welcome, ${session?.user.email}!`);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
        setPlayers((data as unknown as PlayerRow[]).map((p: PlayerRow) => ({
            ...p, 
            gamesPlayed: p.games_played ?? 0,
            isIncludedInDraft: true, 
            positions: Array.isArray(p.positions) ? p.positions as PlayerPosition[] : [PlayerPosition.MID],
        })));
      } else {
        showFlashNotification('info', 'No players found. Seeding database with initial data...');
        const { error: seedError } = await (supabase.from('players') as any).insert(INITIAL_PLAYERS_DATA as PlayerInsert[]);

        if (seedError) {
            showFlashNotification('error', `Failed to seed database: ${seedError.message}`);
        } else {
            const { data: newData, error: newError } = await supabase.from('players').select('*').order('name', { ascending: true });
            if (newData) {
                setPlayers((newData as unknown as PlayerRow[]).map((p: PlayerRow) => ({...p, gamesPlayed: p.games_played ?? 0, player_num: p.player_num ?? 0, isIncludedInDraft: true, positions: p.positions as PlayerPosition[]})));
                showFlashNotification('success', 'Database seeded successfully!');
            }
            if (newError) {
                 showFlashNotification('error', `Error fetching players after seed: ${newError.message}`);
            }
        }
      }
      setIsLoading(false);
    };
    
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
  
  const handleSavePlayerFromModal = useCallback(async (playerData: Omit<Player, 'id' | 'wins' | 'losses' | 'isIncludedInDraft' | 'goals' | 'assists' | 'gamesPlayed'>, editingId?: string) => {
    if (!isAdmin) {
      showFlashNotification('error', 'Admin login required to save players.');
      return;
    }
    const playerRecord = {
        name: playerData.name.trim(),
        player_num: playerData.player_num,
        rating: playerData.rating,
        positions: playerData.positions,
    };

    if (editingId) { 
      const { data, error } = await (supabase.from('players') as any).update(playerRecord).eq('id', editingId).select();
      if (error) {
          showFlashNotification('error', `Failed to update player: ${error.message}`);
          return;
      }
      if (data) {
          const updatedPlayerFromDb: PlayerRow = (data as PlayerRow[])[0];
          const updatedPlayer: Player = {
            id: editingId,
            name: playerData.name.trim(),
            player_num: playerData.player_num,
            rating: playerData.rating,
            positions: playerData.positions,
            isIncludedInDraft: players.find(p => p.id === editingId)?.isIncludedInDraft ?? true,
            wins: players.find(p => p.id === editingId)?.wins ?? 0,
            losses: players.find(p => p.id === editingId)?.losses ?? 0,
            goals: players.find(p => p.id === editingId)?.goals ?? 0,
            assists: players.find(p => p.id === editingId)?.assists ?? 0,
            gamesPlayed: players.find(p => p.id === editingId)?.gamesPlayed ?? 0
          };
          setPlayers(prev => prev.map(p => p.id === editingId ? updatedPlayer : p).sort((a,b) => a.name.localeCompare(b.name)));
          showFlashNotification('success', `${playerRecord.name} updated successfully.`);
      }
    } else { 
      const { data, error } = await (supabase.from('players') as any).insert([playerRecord as PlayerInsert]).select();
      if (error) {
          showFlashNotification('error', `Failed to add player: ${error.message}`);
          return;
      }
      if (data) {
          const newPlayerFromDb: PlayerRow = (data as PlayerRow[])[0];
          const newPlayer: Player = { ...newPlayerFromDb, gamesPlayed: newPlayerFromDb.games_played ?? 0, player_num: newPlayerFromDb.player_num ?? 0, positions: newPlayerFromDb.positions as PlayerPosition[], isIncludedInDraft: true };
          setPlayers(prev => [...prev, newPlayer].sort((a,b) => a.name.localeCompare(b.name)));
          showFlashNotification('success', `${newPlayer.name} added to the roster.`);
      }
    }
    handleModalClose();
  }, [players, isAdmin]);
  
  const handleDeletePlayer = useCallback(async (playerId: string) => {
    if (!isAdmin) {
      showFlashNotification('error', 'Admin login required to delete players.');
      return;
    }
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
  }, [teams, isAdmin]);

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

    if (currentDraftablePlayers.length < 3) {
      showFlashNotification('error', `Please select at least 3 players for the draft. Currently ${currentDraftablePlayers.length} selected.`);
      return;
    }

    // Calculate team sizes with max 1 player difference
    const totalPlayers = currentDraftablePlayers.length;
    const baseSize = Math.floor(totalPlayers / NUM_TEAMS);
    const extraPlayers = totalPlayers % NUM_TEAMS;
    
    const teamSizes = TEAM_NAMES.map((_, index) => baseSize + (index < extraPlayers ? 1 : 0));

    const MAX_ATTEMPTS = 100;
    let bestGeneratedTeams: Team[] | null = null;
    let bestBalanceScore = Infinity;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        let shuffledPlayers = fisherYatesShuffle<Player>(currentDraftablePlayers);
        let newTeamsProtoThisAttempt: Team[] = TEAM_NAMES.map(name => ({ 
            name, 
            players: [] as PlayerInTeam[] 
        }));
        const assignedPlayerIdsThisAttempt = new Set<string>();
        let currentAttemptFailed = false;

        // Assign players to teams based on calculated sizes
        for (let teamIdx = 0; teamIdx < NUM_TEAMS; teamIdx++) {
            const targetSize = teamSizes[teamIdx];
            const team = newTeamsProtoThisAttempt[teamIdx];
            
            for (let slotIndex = 0; slotIndex < targetSize; slotIndex++) {
                if (currentAttemptFailed) break;
                
                // Find best available player for rating balance
                let bestPlayer: Player | null = null;
                let bestPlayerScore = Infinity;
                
                for (const player of shuffledPlayers) {
                    if (assignedPlayerIdsThisAttempt.has(player.id)) continue;
                    
                    // Calculate potential team rating if we add this player
                    const currentTeamRating = calculateTeamTotalRating(team);
                    const potentialTeamRating = currentTeamRating + player.rating;
                    
                    // Calculate average rating of all teams so far (including this one)
                    const allTeamRatings = newTeamsProtoThisAttempt.map(t => calculateTeamTotalRating(t));
                    allTeamRatings[teamIdx] = potentialTeamRating;
                    const avgRating = allTeamRatings.reduce((sum, r) => sum + r, 0) / NUM_TEAMS;
                    
                    // Score is how far this team's rating would be from average
                    const score = Math.abs(potentialTeamRating - avgRating);
                    
                    if (score < bestPlayerScore) {
                        bestPlayerScore = score;
                        bestPlayer = player;
                    }
                }
                
                if (bestPlayer) {
                    // Assign preferred position
                    const getPreferredPosition = (player: Player): PlayerPosition => {
                        if (player.positions.includes(PlayerPosition.MID)) return PlayerPosition.MID;
                        if (player.positions.includes(PlayerPosition.FW)) return PlayerPosition.FW;
                        return player.positions[0] || PlayerPosition.DF;
                    };
                    
                    team.players.push({
                        ...bestPlayer,
                        assignedPositionOnTeam: getPreferredPosition(bestPlayer)
                    });
                    assignedPlayerIdsThisAttempt.add(bestPlayer.id);
                } else {
                    currentAttemptFailed = true;
                }
            }
        }
        
        if (currentAttemptFailed || assignedPlayerIdsThisAttempt.size !== totalPlayers) {
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
        showFlashNotification('error', `Could not generate balanced teams after ${MAX_ATTEMPTS} attempts.`);
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

  const handleRemoveMatch = useCallback((matchId: string) => {
    if (allMatchesFinalized) {
      showFlashNotification('error', 'Cannot remove matches after game day is finalized.');
      return;
    }
    
    setMatches(prevMatches => prevMatches.filter(m => m.id !== matchId));
    showFlashNotification('info', 'Match removed successfully.');
  }, [allMatchesFinalized]);


  const calculateTeamStats = useCallback((matches: Match[], teams: Team[]) => {
  const teamStats = teams.map(team => {
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let goalsScored = 0;
    let goalsConceded = 0;
    let gamesPlayed = 0;

    matches.forEach(match => {
      const isTeam1 = team.name === match.team1Name;
      const isTeam2 = team.name === match.team2Name;
      
      if (!isTeam1 && !isTeam2) return;
      
      // Calculate scores from goal events to ensure they're up to date
      const team1Score = match.goalEvents.filter(g => g.teamName === match.team1Name).length;
      const team2Score = match.goalEvents.filter(g => g.teamName === match.team2Name).length;
      
      const teamScore = isTeam1 ? team1Score : team2Score;
      const opponentScore = isTeam1 ? team2Score : team1Score;
      
      gamesPlayed++;
      goalsScored += teamScore;
      goalsConceded += opponentScore;
      
      if (teamScore > opponentScore) {
        wins++;
      } else if (teamScore < opponentScore) {
        losses++;
      } else {
        draws++;
      }
    });

    const points = wins * 3 + draws * 1;
    const successRate = gamesPlayed > 0 ? ((points / (gamesPlayed * 3)) * 100) : 0;
    const avgGoalsPerGame = gamesPlayed > 0 ? (goalsScored / gamesPlayed).toFixed(2) : '0.00';
    const avgGoalsConcededPerGame = gamesPlayed > 0 ? (goalsConceded / gamesPlayed).toFixed(2) : '0.00';

    return {
      teamName: team.name,
      teamColor: team.name,
      wins,
      losses,
      gamesPlayed,
      goalsScored,
      goalsConceded,
      points,
      successRate: successRate.toFixed(1),
      avgGoalsPerGame,
      avgGoalsConcededPerGame,
    };
  });
  
  return teamStats;
  }, []);

  const handleFinalizeGameDay = useCallback(async () => {
    if (!isAdmin) {
      showFlashNotification('error', 'Admin login required to finalize game day.');
      return;
    }
    if (matches.length === 0) {
        showFlashNotification('error', 'No matches to finalize. Please add at least one match.');
        return;
    }
    
    const playerUpdates = new Map<string, { wins: number; losses: number; goals: number; assists: number; gamesPlayed: number }>();
    players.forEach(p => playerUpdates.set(p.id, { wins: p.wins, losses: p.losses, goals: p.goals, assists: p.assists, gamesPlayed: p.gamesPlayed }));

    matches.forEach(match => {
      const team1 = teams.find(t => t.name === match.team1Name);
      const team2 = teams.find(t => t.name === match.team2Name);

      if (!team1 || !team2 || match.team1Score === null || match.team2Score === null) return;

      const isDraw = match.team1Score === match.team2Score;
      const team1Won = !isDraw && match.team1Score > match.team2Score;
      const team2Won = !isDraw && match.team2Score > match.team1Score;

      team1.players.forEach(pInTeam => { 
        const currentStats = playerUpdates.get(pInTeam.id)!;
        currentStats.gamesPlayed += 1;
        if (team1Won) currentStats.wins += 1;
        else if (team2Won) currentStats.losses += 1;
        playerUpdates.set(pInTeam.id, currentStats);
      });
      team2.players.forEach(pInTeam => { 
        const currentStats = playerUpdates.get(pInTeam.id)!;
        currentStats.gamesPlayed += 1;
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
        games_played: updatedStats.gamesPlayed,
      };
    });
    const { error } = await (supabase.from('players') as any).upsert(updatedPlayerRecords as PlayerInsert[]);

    if (error) {
        showFlashNotification('error', `Failed to update player stats: ${error.message}`);
        return;
    }

    setPlayers(prevPlayers => prevPlayers.map(p => {
      const updatedStats = playerUpdates.get(p.id);
      return updatedStats ? { ...p, ...updatedStats } : p;
    }).sort((a,b) => a.name.localeCompare(b.name)));

    const stats = calculateTeamStats(matches, teams);
    const sortedStats = stats.sort((a, b) => b.points - a.points);
    setGameDayStats(sortedStats);
    setAllMatchesFinalized(true);
    showFlashNotification('success', 'Game day finalized! Player stats updated.');
  }, [matches, teams, players, isAdmin, calculateTeamStats]);

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
    if (draftablePlayersList.length < 3) {
        showFlashNotification('error', `Manual edit requires at least 3 players selected for draft.`);
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
        if(team.players.length === 0) {
            showFlashNotification('error', `Each team must have at least 1 player. ${team.name} has ${team.players.length}.`);
            return;
        }
        totalPlayersInManualTeams += team.players.length;
    }

    const allPlayerIdsInManualTeams = manuallyEditedTeams.flatMap(t => t.players.map(p => p.id));
    if (new Set(allPlayerIdsInManualTeams).size !== totalPlayersInManualTeams) {
        showFlashNotification('error', `Players must be unique across all teams.`);
        return;
    }

    setTeams(manuallyEditedTeams);
    setTeamsConfirmed(true); 
    setMatches([]);
    setAllMatchesFinalized(false);
    setIsManualEditModalOpen(false);
    showFlashNotification('success', 'Teams manually set and confirmed!');
  };
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    clearTeamsAndMatches();
    showFlashNotification('info', 'You have been logged out.');
  };
  
  const handleOpenLoginModal = () => setShowAuthModal(true);

  const sortedPlayers = [...players].sort((a, b) => {
    // Calculate points for both players
    const aDraws = a.gamesPlayed - a.wins - a.losses;
    const bDraws = b.gamesPlayed - b.wins - b.losses;
    const aPoints = a.wins * 3 + aDraws * 1;
    const bPoints = b.wins * 3 + bDraws * 1;
    
    // Primary sort: points descending
    if (bPoints !== aPoints) {
      return bPoints - aPoints;
    }
    // Secondary sort: wins descending
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    // Tertiary sort: goals descending
    if (b.goals !== a.goals) {
      return b.goals - a.goals;
    }
    // Final sort: name ascending
    return a.name.localeCompare(b.name);
  });

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
  const canGenerateTeams = participatingPlayerCount >= 3;
  const canManuallyEdit = participatingPlayerCount >= 3;


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
            .player-roster-table .name-column { min-width: 100px; }
            .player-roster-table .draft-checkbox-column { min-width: 60px; }
            .player-roster-table .player-number-column { min-width: 50px; }
            .player-roster-table .points-column { min-width: 60px; }
        }
        .player-roster-table .positions-column .flex > span:not(:last-child) { margin-right: 0.35rem; } 
        .player-roster-table tr.excluded-from-draft td:not(.actions-column):not(.draft-checkbox-cell) { opacity: 0.6; } 
        .player-roster-table tr.excluded-from-draft .draft-checkbox-cell { opacity: 1; } 
        .draft-checkbox { width: 1.15rem; height: 1.15rem; }
      `}</style>

      <header className="mb-8 text-center relative">
        <div className="absolute top-0 right-0 z-20">
            {isAdmin ? (
                <div className="flex items-center space-x-3 bg-slate-800/50 p-2 rounded-lg">
                    <span className="text-sm text-slate-300 hidden sm:block">{session.user.email}</span>
                    <button onClick={handleLogout} className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-md transition">
                        Logout
                    </button>
                </div>
            ) : (
                <button onClick={handleOpenLoginModal} className="px-4 py-2 text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow-md transition transform hover:scale-105">
                    Admin Login
                </button>
            )}
        </div>
        <h1 className="text-4xl font-bold text-sky-400">Soccer Team Balancer</h1>
        <p className="text-slate-400 mt-2 text-lg">Manage players, generate fair teams, and track your game day stats!</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <button onClick={handleOpenAddPlayerModal} className={getButtonClass('primary', !isAdmin)} disabled={!isAdmin} title={!isAdmin ? 'Admin login required' : 'Add a new player'}>
          Add New Player
        </button>


        {teams.length === 0 && (
          <div className="relative">
            <button 
              onClick={generateTeams} 
              className={getButtonClass('success', !canGenerateTeams)}
              disabled={!canGenerateTeams}
              title={!canGenerateTeams ? `Select at least 3 players for draft` : 'Generate balanced teams'}
            >
              Generate Teams
            </button>
            <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded-full
                             ${participatingPlayerCount >= 3 ? 'bg-emerald-500/80' : 'bg-amber-500/80'} text-white`}>
                Draft: {participatingPlayerCount}
            </span>
          </div>
        )}
         {teams.length === 0 && ( 
            <button
                onClick={handleOpenManualEdit}
                className={getButtonClass('warning', !canManuallyEdit)}
                disabled={!canManuallyEdit}
                title={!canManuallyEdit ? `Select at least 3 players for draft first` : 'Manually create teams'}
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
            className={getButtonClass('info', matches.length === 0 || !isAdmin)}
            disabled={matches.length === 0 || !isAdmin}
            title={!isAdmin ? "Admin login required" : matches.length === 0 ? "Add matches first" : "Finalize and update stats"}
            >
             Finalize Game Day
            </button>
        )}
        
        {teams.length > 0 && (
           <button onClick={clearTeamsAndMatches} className={getButtonClass('danger', false, 'normal')}>
             {allMatchesFinalized || teamsConfirmed ? 'Clear & New Game Day' : 'Clear Teams'}
           </button>
        )}
      </div>
      
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

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
          teamNames={TEAM_NAMES}
        />
      )}


      {teams.length > 0 && (
        <section className="mb-10">
          <h2 className="text-3xl font-semibold mb-6 text-center text-sky-300">
            {teamsConfirmed ? `Confirmed Teams` : `Proposed Teams`}
          </h2>
          {teamsConfirmed && (
            <div className="mb-6 text-center">
              <button 
                onClick={() => {
                  const squadsText = teams.map((team: any) => {
                    let text = `${team.name}\n`;
                    team.players.forEach((player: any) => {
                      text += `${player.name}\n`;
                    });
                    text += '\n';
                    return text;
                  }).join('\n');
                  
                  navigator.clipboard.writeText(squadsText);
                  showFlashNotification('success', 'הרכבים הועתקו ללוח!');
                }}
                className={getButtonClass('info', false)}
                title="Copy team squads to clipboard"
              >
                העתק הרכבים
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(team => (
              <TeamCard key={team.name} team={team} isAdmin={isAdmin} />
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
            <div className="mb-6 text-center space-x-4">
              <button 
                onClick={handleAddMatchClick}
                className={getButtonClass('primary')}
                title="Add a new match pairing"
              >
                Add New Match
              </button>
              <button 
                onClick={() => {
                  if (matches.length === 0) {
                    showFlashNotification('error', 'No matches to generate stats from. Please add matches first.');
                    return;
                  }
                  
                  const stats = calculateTeamStats(matches, teams);
                  const sortedStats = stats.sort((a, b) => b.points - a.points);
                  
                  const statsText = sortedStats.map((team: any, index: number) => {
                    let text = `${index + 1}. ${team.teamColor} - ${team.points} נקודות\n\n`;
                    text += `${team.teamColor}\n`;
                    text += `ניצחונות: ${team.wins}\n`;
                    text += `הפסדים: ${team.losses}\n`;
                    text += `משחקים שוחקו: ${team.gamesPlayed}\n`;
                    text += `שערים שהבקיעו: ${team.goalsScored}\n`;
                    text += `שערים שספגו: ${team.goalsConceded}\n`;
                    text += `אחוז הצלחה: ${team.successRate}%\n`;
                    text += `ממוצע שערים למשחק: ${team.avgGoalsPerGame}\n`;
                    text += `ממוצע שערים שסופגים למשחק: ${team.avgGoalsConcededPerGame}\n\n`;
                    return text;
                  }).join('\n');
                  
                  navigator.clipboard.writeText('דירוג קבוצות:\n\n' + statsText);
                  showFlashNotification('success', 'סטטיסטיקות הועתקו ללוח!');
                }}
                className={getButtonClass('info', matches.length === 0)}
                title="Copy day statistics to clipboard"
              >
                העתק סטטיסטיקות יום
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
                  onRemoveMatch={handleRemoveMatch}
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
                                 ${participatingPlayerCount >= 3 ? 'bg-emerald-600' : 'bg-amber-600'} text-white shadow-md`}>
                    Selected for Draft: {participatingPlayerCount}
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
                  <th scope="col" className="p-3 text-sm font-semibold text-slate-200 text-center player-number-column">#</th>
                  <th scope="col" className="p-3 text-sm font-semibold text-slate-200 name-column">Name</th>
                  <th scope="col" className="p-3 text-sm font-semibold text-slate-200 text-center points-column">Points</th>
                  <th scope="col" className="p-3 text-sm font-semibold text-slate-200 text-center">Wins/Losses</th>
                  <th scope="col" className="p-3 text-sm font-semibold text-slate-200 text-center">Goals/Assists</th>
                  <th scope="col" className="p-3 text-sm font-semibold text-slate-200 text-center positions-column">Positions</th>
                  {isAdmin && (
                    <>
                      <th scope="col" className="p-3 text-sm font-semibold text-slate-200 text-center star-column">Rating</th>
                      <th scope="col" className="p-3 text-sm font-semibold text-slate-200 text-right actions-column">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {sortedPlayers.map(player => {
                  const draws = player.gamesPlayed - player.wins - player.losses;
                  const points = player.wins * 3 + draws * 1;
                  
                  return (
                  <tr 
                    key={player.id} 
                    className={`transition-colors duration-150 ${player.isIncludedInDraft ? 'hover:bg-slate-700/40' : 'excluded-from-draft hover:bg-slate-700/30'}`}
                  >
                    <td className="p-3 text-center">
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
                    <td className="p-3 text-slate-200 text-center">{player.player_num || '-'}</td>
                    <td className="p-3 text-slate-200 name-column whitespace-nowrap">{player.name}</td>
                    <td className="p-3 text-slate-200 text-center font-medium">{points}</td>
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
                    <td className="p-3 text-center positions-column">
                      <div className="flex justify-center items-center flex-wrap gap-1">
                        {player.positions.map(pos => <PositionBadge key={pos} position={pos} />)}
                      </div>
                    </td>
                    {isAdmin && (
                      <>
                        <td className="p-3 star-column">
                          <div className="flex justify-center">
                            <StarRating rating={player.rating} size="sm" />
                          </div>
                        </td>
                        <td className="p-3 text-right actions-column">
                          <div className="flex justify-end space-x-2">
                             <button
                                onClick={() => handleOpenEditPlayerModal(player)}
                                className={getButtonClass('edit', !isAdmin || teams.length > 0, 'small') + " action-button"}
                                title={!isAdmin ? "Admin login required" : teams.length > 0 ? "Clear teams before editing" : "Edit player"}
                                disabled={!isAdmin || teams.length > 0}
                                aria-label={`Edit player ${player.name}`}
                              >
                               Edit
                              </button>
                              <button
                                onClick={() => handleDeletePlayer(player.id)}
                                className={getButtonClass('danger', !isAdmin || teams.length > 0, 'small') + " action-button"}
                                title={!isAdmin ? "Admin login required" : teams.length > 0 ? "Clear teams before deleting" : "Delete player"}
                                disabled={!isAdmin || teams.length > 0}
                                aria-label={`Delete player ${player.name}`}
                              >
                                Delete
                              </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="mt-12 pt-8 border-t border-slate-700 text-center">
        <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} Soccer Team Balancer. App Version 4.0 - Flexible Team Sizes</p>
      </footer>
      <Analytics />
    </div>
  );
};

export default App;
