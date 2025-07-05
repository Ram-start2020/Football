import React, { useState, useEffect } from 'react';
import { PlayerPosition, PlayerFormModalProps, Player } from '../types';

const PlayerFormModal: React.FC<PlayerFormModalProps> = ({ isOpen, onClose, onSavePlayer, editingPlayer, existingPlayerNames }) => {
  const [name, setName] = useState('');
  const [rating, setRating] = useState<number>(3);
  const [selectedPositions, setSelectedPositions] = useState<PlayerPosition[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!editingPlayer;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && editingPlayer) {
        setName(editingPlayer.name);
        setRating(editingPlayer.rating);
        setSelectedPositions(editingPlayer.positions || []);
      } else {
        setName('');
        setRating(3);
        setSelectedPositions([PlayerPosition.MID]); // Default to Midfielder or empty
      }
      setError(null);
    }
  }, [isOpen, editingPlayer, isEditMode]);

  const handlePositionChange = (position: PlayerPosition) => {
    setSelectedPositions(prev =>
      prev.includes(position)
        ? prev.filter(p => p !== position)
        : [...prev, position]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Player name cannot be empty.');
      return;
    }

    const trimmedNameLower = name.trim().toLowerCase();
    const otherPlayerNames = existingPlayerNames
        .map(n => n.toLowerCase())
        .filter(n => isEditMode ? n !== editingPlayer.name.toLowerCase() : true);

    if (otherPlayerNames.includes(trimmedNameLower)) {
      setError('Player name already exists.');
      return;
    }

    if (rating < 1 || rating > 5) {
      setError('Rating must be between 1 and 5.');
      return;
    }
    if (selectedPositions.length === 0) {
      setError('Player must have at least one position selected.');
      return;
    }

    const playerData: Omit<Player, 'id' | 'wins' | 'losses' | 'isIncludedInDraft' | 'goals' | 'assists'> = {
      name: name.trim(),
      rating,
      positions: selectedPositions,
    };

    onSavePlayer(playerData, editingPlayer?.id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
      <div className="bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 ease-in-out scale-100">
        <h2 className="text-2xl font-semibold mb-6 text-sky-400">
          {isEditMode ? 'Edit Player' : 'Add New Player'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="playerName" className="block text-sm font-medium text-slate-300 mb-1">Player Name</label>
            <input
              type="text"
              id="playerName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-slate-100 placeholder-slate-400"
              placeholder="e.g., Alex Morgan"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="playerRating" className="block text-sm font-medium text-slate-300 mb-1">Rating (1-5)</label>
            <input
              type="number"
              id="playerRating"
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value))}
              min="1"
              max="5"
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-slate-100"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">Positions (Select at least one)</label>
            <div className="space-y-2">
              {Object.values(PlayerPosition).map(posValue => (
                <div key={posValue} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`pos-${posValue}`}
                    value={posValue}
                    checked={selectedPositions.includes(posValue)}
                    onChange={() => handlePositionChange(posValue)}
                    className="h-5 w-5 text-sky-500 bg-slate-600 border-slate-500 rounded focus:ring-sky-400 accent-sky-500"
                  />
                  <label htmlFor={`pos-${posValue}`} className="ml-2 text-slate-200">
                    {posValue}
                  </label>
                </div>
              ))}
            </div>
          </div>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-100 rounded-md transition duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition duration-150 font-semibold"
            >
              {isEditMode ? 'Save Changes' : 'Add Player'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlayerFormModal;
