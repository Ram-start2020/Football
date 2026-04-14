import React, { useState } from 'react';
import './PlayerFormModal.css';

const PlayerFormModal = () => {
    const [rating, setRating] = useState(0);

    const handleRatingChange = (event) => {
        const value = parseFloat(event.target.value);
        if (value >= 0.5 && value <= 5 && (value * 10) % 5 === 0) {
            setRating(value);
        }
    };

    return (
        <div className='modal'>
            <h2>Player Rating</h2>
            <input
                type='number'
                value={rating}
                min='0.5'
                max='5'
                step='0.5'
                onChange={handleRatingChange}
            />
            <p>Current Rating: {rating}</p>
        </div>
    );
};

export default PlayerFormModal;