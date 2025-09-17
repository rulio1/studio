
'use client';

import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { BadgeCheck, Bird, MoreHorizontal } from 'lucide-react';
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
    bronze: 'fill-amber-600 text-white',
    silver: 'fill-slate-400 text-white',
    gold: 'fill-yellow-400 text-white'
};

export default function PostShareCard({ post }: { post: Post }) {
    if (!post) return null;

    const isZisprAccount = post.handle === '@Zispr';
    const isRulio = post.handle === '@Rulio';
    const isPostVerified = post.isVerified || isRulio;
    const badgeColor = post.badgeTier ? badgeColors[post.badgeTier] : 'fill-primary text-white';

    const formattedDate = post.createdAt?.toDate ? format(post.createdAt.toDate(), "h:mm a · dd 'de' MMM 'de' yy", { locale: ptBR }) : '';

    return (
        <div className="w-[380px] p-4 font-body" style={{ backgroundColor: 'white', color: 'black' }}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={post.avatar} />
                        <AvatarFallback>{post.avatarFallback}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-bold text-base flex items-center gap-1">
                            {post.author}
                            {isZisprAccount ? <Bird className="h-5 w-5 text-blue-400 fill-blue-400" /> : (isPostVerified && <BadgeCheck className={`h-5 w-5 ${isRulio ? 'fill-blue-500 text-white' : badgeColor}`} />)}
                        </p>
                        <p className="text-sm text-gray-500">{post.handle}</p>
                    </div>
                </div>
                <MoreHorizontal className="h-5 w-5 text-gray-500" />
            </div>

            <p className="text-xl whitespace-pre-wrap mb-4">
                {post.content}
            </p>

            <p className="text-sm text-gray-500">
                {formattedDate}
            </p>
        </div>
    );
}
