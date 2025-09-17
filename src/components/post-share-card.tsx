
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
        color: 'black',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxSizing: 'border-box'
    };

    return (
        <div style={cardStyle}>
            {/* Cabeçalho com Avatar, Nome e Logo */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img 
                        src={avatarDataUri}
                        style={{ width: '48px', height: '48px', borderRadius: '50%' }} 
                        alt="Avatar"
                    />
                    <div>
                        <p style={{ fontWeight: 'bold', fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {post.author}
                            {isVerified && (
                               <BadgeCheck style={{ height: '18px', width: '18px', color: badgeColor, fill: isRulio ? 'white' : 'transparent' }} strokeWidth={2} />
                            )}
                        </p>
                        <p style={{ fontSize: '14px', color: '#71717a', margin: 0 }}>{post.handle}</p>
                    </div>
                </div>
                <Bird style={{ height: '24px', width: '24px', color: '#0ea5e9' }} />
            </div>
            
            {/* Conteúdo do Post */}
            <p style={{ fontSize: '18px', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.5 }}>
                {post.content}
            </p>

            {/* Data do Post */}
            <p style={{ fontSize: '14px', color: '#71717a', margin: 0 }}>
                {post.date}
            </p>
        </div>
    );
}
