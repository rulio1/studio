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
    bronze: 'text-amber-600',
    silver: 'text-slate-400',
    gold: 'text-yellow-400'
};

export default function PostShareCard({ post }: { post: Post }) {
    if (!post) return null;

    const isZisprAccount = post.handle === '@Zispr';
    const isRulio = post.handle === '@Rulio';
    const isPostVerified = post.isVerified || isRulio;
    const badgeColor = post.badgeTier ? badgeColors[post.badgeTier] : 'text-primary';

    const formattedDate = post.createdAt?.toDate ? format(post.createdAt.toDate(), "h:mm a · dd 'de' MMM 'de' yy", { locale: ptBR }) : '';

    return (
        <div className="w-[380px] text-white p-6 rounded-2xl font-body">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={post.avatar} />
                        <AvatarFallback>{post.avatarFallback}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-bold text-base flex items-center gap-1">
                            {post.author}
                            {isZisprAccount ? <Bird className="h-4 w-4 text-blue-400" /> : (isPostVerified && <BadgeCheck className={`h-5 w-5 ${isRulio ? 'text-white fill-blue-500' : badgeColor}`} />)}
                        </p>
                        <p className="text-sm text-gray-500">{post.handle}</p>
                    </div>
                </div>
                <Bird className="h-7 w-7 text-blue-400" />
            </div>

            <p className="text-xl whitespace-pre-wrap mb-4">
                {post.content}
            </p>

            <p className="text-sm text-gray-500 mb-3">
                {formattedDate}
            </p>

            <div className="border-t border-b border-gray-800 py-3 flex gap-5">
                <p><span className="font-bold">{post.retweets?.length || 0}</span> <span className="text-gray-500">Reposts</span></p>
                <p><span className="font-bold">{post.comments || 0}</span> <span className="text-gray-500">Comentários</span></p>
                <p><span className="font-bold">{post.likes?.length || 0}</span> <span className="text-gray-500">Curtidas</span></p>
            </div>
        </div>
    );
}
