

import { PlayerPosition, Player } from './types';

export const NUM_TEAMS = 3;

// Defines the CORE structure of each team (6 players)
export const POSITIONS_PER_TEAM: Record<PlayerPosition, number> = {
  [PlayerPosition.DF]: 3,
  [PlayerPosition.MID]: 2,
  [PlayerPosition.FW]: 1,
};

// Total number of slots for each CORE position across all teams
export const TOTAL_POSITIONS_NEEDED: Record<PlayerPosition, number> = {
  [PlayerPosition.DF]: POSITIONS_PER_TEAM[PlayerPosition.DF] * NUM_TEAMS, // 9
  [PlayerPosition.MID]: POSITIONS_PER_TEAM[PlayerPosition.MID] * NUM_TEAMS, // 6
  [PlayerPosition.FW]: POSITIONS_PER_TEAM[PlayerPosition.FW] * NUM_TEAMS, // 3
};

export const TEAM_NAMES = ['כחולים', 'לבנים', 'צהובים'];

export const INITIAL_PLAYERS_DATA: Omit<Player, 'id' | 'wins' | 'losses' | 'goals' | 'assists' | 'isIncludedInDraft' | 'gamesPlayed'>[] = [
  // Forwards (some versatile)
  { name: 'Alex "Striker" Johnson', rating: 5, positions: [PlayerPosition.FW] },
  { name: 'Ben "Goal" Miller', rating: 4, positions: [PlayerPosition.FW, PlayerPosition.MID] },
  { name: 'Casey "Fox" Davis', rating: 3, positions: [PlayerPosition.FW] },
  // Midfielders (some versatile)
  { name: 'Dana "Maestro" Lee', rating: 5, positions: [PlayerPosition.MID, PlayerPosition.FW] },
  { name: 'Eli "Engine" Smith', rating: 4, positions: [PlayerPosition.MID] },
  { name: 'Finn "Playmaker" Brown', rating: 4, positions: [PlayerPosition.MID, PlayerPosition.DF] },
  { name: 'Gale "Pass" Wilson', rating: 3, positions: [PlayerPosition.MID] },
  { name: 'Harper "Dynamo" Garcia', rating: 3, positions: [PlayerPosition.MID] },
  { name: 'Iris "Spark" Rodriguez', rating: 2, positions: [PlayerPosition.MID] },
  // Defenders (some versatile)
  { name: 'Jack "The Wall" Martinez', rating: 5, positions: [PlayerPosition.DF] },
  { name: 'Kai "Rock" Anderson', rating: 4, positions: [PlayerPosition.DF, PlayerPosition.MID] },
  { name: 'Liam "Titan" Thomas', rating: 4, positions: [PlayerPosition.DF] },
  { name: 'Morgan "King" Jackson', rating: 3, positions: [PlayerPosition.DF] },
  { name: 'Noel "Stopper" White', rating: 3, positions: [PlayerPosition.DF] },
  { name: 'Owen "Guardian" Harris', rating: 3, positions: [PlayerPosition.DF] },
  { name: 'Pat "Backbone" Martin', rating: 2, positions: [PlayerPosition.DF] },
  { name: 'Quinn "Last Line" Thompson', rating: 2, positions: [PlayerPosition.DF] },
  { name: 'Riley "Sweeper" Moore', rating: 1, positions: [PlayerPosition.DF] },
  // Extra players
  { name: 'Sam "Shadow" Green', rating: 4, positions: [PlayerPosition.MID, PlayerPosition.DF] },
  { name: 'Terry "Flash" Bell', rating: 5, positions: [PlayerPosition.FW, PlayerPosition.MID] },
  // Add 3 more for 7v7 mode testing
  { name: 'Uma "Utility" Vance', rating: 3, positions: [PlayerPosition.DF, PlayerPosition.MID, PlayerPosition.FW] },
  { name: 'Vic "Versatile" King', rating: 4, positions: [PlayerPosition.DF, PlayerPosition.MID] },
  { name: 'Wendy "Winger" Cross', rating: 3, positions: [PlayerPosition.FW] },
];