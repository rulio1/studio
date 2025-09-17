
'use client';

import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { BadgeCheck, Bird } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Post {
    id: string;
    authorId: string;
    avatar: string;
    avatarFallback: string;
    author: string;
    handle: string;
    createdAt: any;
    content: string;
    isVerified?: boolean;
    badgeTier?: 'bronze' | 'silver' | 'gold';
    likes: string[];
    comments: number;
    retweets: string[];
}

const badgeColors = {
    bronze: '#a16207', // amber-600
    silver: '#71717a', // slate-400
    gold: '#facc15'    // yellow-400
};

export default function PostShareCard({ post }: { post: Post }) {
    if (!post) return null;

    const isZisprAccount = post.handle === '@Zispr';
    const isRulio = post.handle === '@Rulio';
    const isPostVerified = post.isVerified || isRulio;
    
    let badgeColor = '#0ea5e9'; // primary
    if(isRulio) badgeColor = '#0ea5e9';
    else if(post.badgeTier) badgeColor = badgeColors[post.badgeTier];


    const formattedDate = post.createdAt?.toDate ? format(post.createdAt.toDate(), "h:mm a · dd 'de' MMM 'de' yy", { locale: ptBR }) : '';

    return (
        <div style={{ 
            width: '400px', 
            padding: '24px', 
            fontFamily: 'Inter, sans-serif', 
            backgroundColor: 'white', 
            color: 'black',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img 
                        src={post.avatar} 
                        style={{ width: '48px', height: '48px', borderRadius: '50%' }} 
                        alt={post.author}
                    />
                    <div>
                        <p style={{ fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                            {post.author}
                            {isZisprAccount ? (
                                <Bird style={{ height: '18px', width: '18px', color: '#0ea5e9', fill: '#0ea5e9' }} />
                            ) : (isPostVerified && (
                                <BadgeCheck style={{ height: '18px', width: '18px', color: 'white', fill: badgeColor }} />
                            ))}
                        </p>
                        <p style={{ fontSize: '14px', color: '#71717a', margin: 0 }}>{post.handle}</p>
                    </div>
                </div>
                 <Bird style={{ height: '24px', width: '24px', color: '#0ea5e9' }} />
            </div>

            <p style={{ fontSize: '18px', whiteSpace: 'pre-wrap', margin: 0, lineHeight: '1.5' }}>
                {post.content}
            </p>

            <p style={{ fontSize: '14px', color: '#71717a', margin: 0 }}>
                {formattedDate}
            </p>
        </div>
    );
}
