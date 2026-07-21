import React from 'react';

// Shimmer placeholder for loading states (replaces plain "Đang tải…" text).
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`skeleton rounded-DEFAULT ${className}`} aria-hidden="true" />
);

/** A few stacked skeleton rows for table/list loading. */
export const SkeletonRows: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
    <div className="space-y-2" aria-label="Đang tải" role="status">
        {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
        ))}
    </div>
);

export default Skeleton;
