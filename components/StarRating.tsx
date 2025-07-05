
import React from 'react';
import { StarRatingProps } from '../types';

const StarRating: React.FC<StarRatingProps> = ({ rating, size = 'md' }) => {
  const starSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className="flex">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={`${starSizeClasses[size]} ${i < rating ? 'text-yellow-400' : 'text-slate-600'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true" // Decorative, so hide from screen readers
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.962a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.448a1 1 0 00-.364 1.118l1.287 3.962c.3.921-.755 1.688-1.54 1.118l-3.368-2.448a1 1 0 00-1.175 0l-3.368 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.962a1 1 0 00-.364-1.118L2.05 9.389c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z" />
        </svg>
      ))}
       <span className="sr-only">{rating} out of 5 stars</span>
    </div>
  );
};

export default StarRating;