
'use client';

import { Bird, BadgeCheck } from 'lucide-react';
import React from 'react';

// Interfaces simplificadas para o cartão de compartilhamento
interface PostInfo {
    author: string;
    handle: string;
    content: string;
    date: string;
    isVerified?: boolean;
    badgeTier?: 'bronze' | 'silver' | 'gold';
}

interface PostShareCardProps {
    post: PostInfo;
    avatarDataUri: string;
}

const badgeColors = {
    bronze: '#a16207', // amber-600
    silver: '#71717a', // slate-400
    gold: '#f59e0b'   // yellow-400
};

// Este componente é projetado para ser renderizado fora da tela e convertido em uma imagem.
// Ele usa estilos inline para garantir uma renderização consistente pela biblioteca html-to-image.
export default function PostShareCard({ post, avatarDataUri }: PostShareCardProps) {
    if (!post) return null;

    const isRulio = post.handle === '@Rulio';
    const isVerified = post.isVerified || isRulio;
    const badgeColor = isRulio ? '#0ea5e9' : (post.badgeTier ? badgeColors[post.badgeTier] : '#0ea5e9');

    // Estilo para o cartão principal
    const cardStyle: React.CSSProperties = {
        width: '400px',
        padding: '24px',
        fontFamily: "'Inter', sans-serif",
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxSizing: 'border-box'
    };

    const SvgBadgeCheck = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={isRulio ? badgeColor : "none"} stroke={badgeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <path d="m9 12 2 2 4-4"></path>
        </svg>
    );
    
    const SvgBird = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
            <path d="M4 21v-7a6 6 0 0 1 6-6"/>
        </svg>
    )


    return (
        <div style={cardStyle}>
            {/* Cabeçalho com Avatar, Nome e Logo */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {avatarDataUri && (
                         <img 
                            src={avatarDataUri}
                            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} 
                            alt="Avatar"
                        />
                    )}
                    <div>
                        <p style={{ fontWeight: 'bold', fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '4px', color: '#111827' }}>
                            {post.author}
                            {isVerified && <SvgBadgeCheck />}
                        </p>
                        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{post.handle}</p>
                    </div>
                </div>
                <SvgBird />
            </div>
            
            {/* Conteúdo do Post */}
            <p style={{ fontSize: '18px', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.5, color: '#111827' }}>
                {post.content}
            </p>

            {/* Data do Post */}
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                {post.date}
            </p>
        </div>
    );
}
