export enum PlayerPosition {
  DF = 'Defender',
  MID = 'Midfielder',
  FW = 'Forward',
}

export interface Player {
  id: string;
  name: string;
  rating: number; // 1-5
  positions: PlayerPosition[]; // Player can play multiple positions
  wins: number;
  losses: number;
  goals: number;
  assists: number;
  gamesPlayed: number;
  isIncludedInDraft?: boolean; // True if player is included in team generation
}

// Represents a player assigned to a team, with a specific role for that team
export interface PlayerInTeam extends Player {
  assignedPositionOnTeam: PlayerPosition;
}

export interface Team {
  name: string;
  players: PlayerInTeam[]; // Teams will consist of players with an assigned role
}

// Props for PlayerFormModal
export interface PlayerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Callback for saving player data (handles both add and edit)
  // Omit 'id', 'wins', 'losses', 'goals', 'assists', 'isIncludedInDraft' as these are managed by App.tsx or not editable in form.
  onSavePlayer: (playerData: Omit<Player, 'id' | 'wins' | 'losses' | 'isIncludedInDraft' | 'goals' | 'assists' | 'gamesPlayed'>, editingId?: string) => void;
  editingPlayer: Player | null; // Player object if editing, null if adding
  existingPlayerNames: string[];
}

export interface TeamCardProps {
  team: Team;
}

export interface GoalEvent {
  id: string;
  teamName: string;
  scorerId: string | null; // null for own goal
  assisterId: string | null; // null for no assist
}


export interface Match {
  id: string;
  team1Name: string;
  team2Name: string;
  team1Score: number | null;
  team2Score: number | null;
  goalEvents: GoalEvent[];
}

export interface MatchPlayCardProps {
  match: Match;
  teams: Team[];
  onAddGoal: (matchId: string, teamName: string, scorerId: string | null, assisterId: string | null) => void;
  onRemoveGoal: (matchId: string, goalId: string) => void;
  isFinalized: boolean;
}

export interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
}

export interface PositionBadgeProps {
  position: PlayerPosition;
}