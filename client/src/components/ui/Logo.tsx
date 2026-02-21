import React from 'react';

type LogoVariant = 'main' | 'navbar';

interface LogoProps {
    className?: string;
    variant?: LogoVariant;
}

export function Logo({ className, variant = 'main' }: LogoProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            role="img"
            aria-label="Celestask logo"
            preserveAspectRatio="xMidYMid meet"
        >
            <title>Celestask logo</title>
            <g
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeWidth={variant === 'navbar' ? 1.5 : 1.8}
            >
                <path d="M12 2.75v2.1M12 19.15v2.1M4.85 12h-2.1M21.25 12h-2.1M6.75 6.75l-1.5-1.5M18.75 18.75l-1.5-1.5M6.75 17.25l-1.5 1.5M18.75 5.25l-1.5 1.5" />
                <circle cx="12" cy="12" r={variant === 'navbar' ? 4 : 4.2} />
                <path d={variant === 'navbar' ? 'M15.1 7.7a4.25 4.25 0 1 0 0 8.5' : 'M15.3 7.4a4.65 4.65 0 1 0 0 9.2'} />
                <path d={variant === 'navbar' ? 'M14.15 8.6a3.1 3.1 0 1 1 0 6.8' : 'M14.2 8.45a3.45 3.45 0 1 1 0 7.1'} />
            </g>
        </svg>
    );
}
