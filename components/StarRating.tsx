import React from 'react';
import { StarRatingProps } from '../types';

const StarRating: React.FC<StarRatingProps> = ({ rating, size = 'md' }) => {
  const starSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => {
        const isFilled = i < Math.floor(rating);
        const isHalf = i === Math.floor(rating) && rating % 1 !== 0;

        return (
          <div key={i} className="relative">
            {/* Background (empty) star */}
            <svg
              className={`${starSizeClasses[size]} text-slate-600`}
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.962a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.448a1 1 0 00-.364 1.118l1.287 3.962c.3.921-.755 1.688-1.54 1.118l-3.368-2.447a1 1 0 00-1.175 0l-3.368 2.447c-.784.57-1.838-.197-1.539-1.118l1.287-3.962a1 1 0 00-.364-1.118L2.05 9.427c-.783-.57-.381-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.962z" />
            </svg>
            
            {/* Filled/Half star overlay */}
            {(isFilled || isHalf) && (
              <svg
                className={`${starSizeClasses[size]} text-yellow-400 absolute top-0 left-0`}
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
                style={{
                  width: isHalf ? '75%' : '100%',
                  overflow: 'hidden',
                }}
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.962a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.448a1 1 0 00-.364 1.118l1.287 3.962c.3.921-.755 1.688-1.54 1.118l-3.368-2.447a1 1 0 00-1.175 0l-3.368 2.447c-.784.57-1.838-.197-1.539-1.118l1.287-3.962a1 1 0 00-.364-1.118L2.05 9.427c-.783-.57-.381-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.962z" />
              </svg>
            )}
          </div>
        );
      })}
      <span className="sr-only">{rating} out of 5 stars</span>
    </div>
  );
};

export default StarRating;
