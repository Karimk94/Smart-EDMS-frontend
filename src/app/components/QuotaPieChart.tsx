import React from 'react';

interface QuotaPieChartProps {
    remaining: number;
    total: number;
    compact?: boolean;
}

const QuotaPieChart: React.FC<QuotaPieChartProps> = ({ remaining, total, compact = false }) => {
    // Ensure valid numbers
    const safeTotal = total > 0 ? total : 1073741824; // Default to 1GB if invalid

    // Safety check: If remaining is null/undefined/NaN, assume it equals total (0% used)
    // Javascript Math.max(0, null) is 0, which is wrong for us (would mean 100% used)
    const safeRemaining = (remaining === undefined || remaining === null || isNaN(remaining))
        ? safeTotal
        : Math.max(0, remaining);

    // Calculate used amount
    const used = safeTotal - safeRemaining;

    // Calculate percentage used
    const percentage = Math.min(100, (used / safeTotal) * 100);

    // SVG parameters
    const size = compact ? 32 : 50;
    const strokeWidth = compact ? 4 : 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    // Color determination (Usage Based)
    let strokeColor = "text-green-500 dark:text-green-400"; // Low usage (< 50%)
    if (percentage > 90) {
        strokeColor = "text-red-500 dark:text-red-400"; // Critical usage (> 90%)
    } else if (percentage > 75) {
        strokeColor = "text-orange-500 dark:text-orange-400"; // High usage (75-90%)
    } else if (percentage > 50) {
        strokeColor = "text-yellow-500 dark:text-yellow-400"; // Medium usage (50-75%)
    }

    // Format helper within component
    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    const chart = (
        <div className="relative" title={compact ? `${formatSize(used)} used of ${formatSize(safeTotal)}` : undefined}>
            {/* Background Circle */}
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className="text-gray-200 dark:text-gray-700"
                />
                {/* Progress Circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className={`transition-all duration-500 ${strokeColor}`}
                />
            </svg>
            {/* Text in center */}
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-bold ${strokeColor}`}>
                    {Math.round(percentage)}%
                </span>
            </div>
        </div>
    );

    if (compact) {
        return chart;
    }

    return (
        <div className="flex items-center gap-3">
            {chart}
            <div className="flex flex-col text-xs">
                <span className="font-medium text-gray-900 dark:text-white">
                    {formatSize(used)} used
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                    of {formatSize(safeTotal)}
                </span>
            </div>
        </div>
    );
};

export default QuotaPieChart;
