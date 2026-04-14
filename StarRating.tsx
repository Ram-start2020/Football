import React from 'react';
import { FaStar } from 'react-icons/fa';

interface StarRatingProps {
    rating: number;
    starCount?: number;
    starColor?: string;
    emptyStarColor?: string;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, starCount = 5, starColor = '#FFD700', emptyStarColor = '#e4e5e9' }) => {
    const stars: JSX.Element[] = [];

    for (let i = 1; i <= starCount; i++) {
        const starValue = i;
        let fill = 0;

        if (rating >= starValue) {
            fill = 100; // full star
        } else if (rating > starValue - 1) {
            fill = 50; // half star
        } else {
            fill = 0; // empty star
        }

        stars.push(
            <div key={i} style={{ display: 'inline-block', width: '20px', height: '20px' }}>
                <FaStar color={fill === 100 ? starColor : emptyStarColor} style={{ position: 'absolute' }} />
                <FaStar color={starColor} style={{ position: 'absolute', width: `${fill}%`, overflow: 'hidden' }} />
            </div>
        );
    }

    return <div>{stars}</div>;
};

export default StarRating;