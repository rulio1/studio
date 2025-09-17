
'use client';

import React from 'react';
import { Bird, BadgeCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PostShareCardProps {
    author: string;
    handle: string;
    avatar: string;
    content: string;
    isVerified?: boolean;
    badgeTier?: 'bronze' | 'silver' | 'gold';
    createdAt: string; 
}

const badgeColors = {
    bronze: '#a16207', // amber-600
    silver: '#71717a', // slate-400
    gold: '#facc15'   // yellow-400
};
const zisprPrimary = '#0ea5e9'; // sky-500

export const PostShareCard = React.forwardRef<HTMLDivElement, PostShareCardProps>(
  ({ author, handle, avatar, content, isVerified, badgeTier, createdAt }, ref) => {
    
    const isRulio = handle === '@Rulio';
    const showVerified = isVerified || isRulio;
    const badgeColor = isRulio ? zisprPrimary : (badgeTier ? badgeColors[badgeTier] : zisprPrimary);

    const formattedDate = format(new Date(createdAt), "h:mm a · d 'de' MMM. 'de' yyyy", { locale: ptBR });

    return (
      <div
        ref={ref}
        style={{
          width: '400px',
          padding: '24px',
          backgroundColor: 'white',
          fontFamily: "'Inter', sans-serif",
          display: 'flex',
          flexDirection: 'column',
          color: '#111827', // gray-900
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <img
            src={avatar}
            alt="avatar"
            style={{ width: '48px', height: '48px', borderRadius: '9999px', marginRight: '12px' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '16px' }}>{author}</span>
              {showVerified && (
                 <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginLeft: '4px', color: badgeColor, fill: badgeColor }}
                >
                    <path d="M3.85 8.62a4 4 0 0 1 4.78-4.78l.22.22a.75.75 0 0 0 1.06 0l.22-.22a4 4 0 0 1 4.78 4.78l-.22.22a.75.75 0 0 0 0 1.06l.22.22a4 4 0 0 1-4.78 4.78l-.22-.22a.75.75 0 0 0-1.06 0l-.22.22a4 4 0 0 1-4.78-4.78l.22-.22a.75.75-0 0 0 0-1.06z"/>
                    <path d="m9 12 2 2 4-4" />
                </svg>
              )}
            </div>
            <span style={{ color: '#6b7280', fontSize: '14px' }}>{handle}</span>
          </div>
        </div>
        
        {/* Content */}
        <p style={{ fontSize: '16px', lineHeight: '1.5', whiteSpace: 'pre-wrap', marginBottom: '16px', wordWrap: 'break-word' }}>
          {content}
        </p>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
          <span style={{ color: '#6b7280', fontSize: '12px' }}>{formattedDate}</span>
          <div style={{ display: 'flex', alignItems: 'center', color: '#6b7280' }}>
            <Bird style={{ width: '16px', height: '16px', marginRight: '4px', color: zisprPrimary }} />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Zispr</span>
          </div>
        </div>
      </div>
    );
  }
);

PostShareCard.displayName = 'PostShareCard';
