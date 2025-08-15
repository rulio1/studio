
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, BarChart2, MessageCircle, Heart, Repeat, Upload, MoreHorizontal } from 'lucide-react';
import Image from 'next/image';

interface Post {
    id: number;
    avatar: string;
    avatarFallback: string;
    author: string;
    handle: string;
    time: string;
    content: string;
    image?: string;
    imageHint?: string;
    comments: number;
    retweets: number;
    likes: number;
    views: string;
    isLiked: boolean;
    isRetweeted: boolean;
}

interface Comment {
    id: number;
    avatar: string;
    avatarFallback: string;
    author: string;
    handle: string;
    time: string;
    content: string;
}

const initialPosts: Post[] = [
    {
        id: 1,
        avatar: 'https://placehold.co/48x48.png',
        avatarFallback: 'JD',
        author: 'Jane Doe',
        handle: '@jane',
        time: '2h',
        content: 'Just discovered this amazing new coffee shop! ☕️ The atmosphere is so cozy and the latte art is on point. Highly recommend!',
        image: 'https://placehold.co/500x300.png',
        imageHint: 'coffee shop',
        comments: 23,
        retweets: 11,
        likes: 61,
        views: '1.2k',
        isLiked: false,
        isRetweeted: false,
    },
    {
        id: 2,
        avatar: 'https://placehold.co/48x48.png',
        avatarFallback: 'JS',
        author: 'John Smith',
        handle: '@john',
        time: '4h',
        content: 'Just built a new app with Next.js and Firebase! What a great stack!',
        comments: 10,
        retweets: 5,
        likes: 32,
        views: '800',
        isLiked: false,
        isRetweeted: false,
    }
];

const initialComments: Comment[] = [
    {
        id: 1,
        avatar: 'https://placehold.co/48x48.png',
        avatarFallback: 'T',
        author: 'Tom',
        handle: '@tom',
        time: '1h',
        content: 'I need to check this place out!',
    },
    {
        id: 2,
        avatar: 'https://placehold.co/48x48.png',
        avatarFallback: 'A',
        author: 'Alice',
        handle: '@alice',
        time: '30m',
        content: 'Looks awesome! Thanks for sharing.',
    },
];

export default function PostDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { id } = params;
    
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        if (id) {
            const postId = parseInt(id as string, 10);
            const foundPost = initialPosts.find(p => p.id === postId);
            if (foundPost) {
                setPost(foundPost);
                // In a real app, you would fetch comments for this post
                setComments(initialComments);
            }
        }
    }, [id]);

    const handleReply = () => {
        if (!newComment.trim()) return;
        const reply: Comment = {
            id: Date.now(),
            author: 'Barbie 🎀',
            handle: '@pussypinkprint',
            avatar: 'https://placehold.co/40x40.png',
            avatarFallback: 'B',
            time: 'Just now',
            content: newComment,
        };
        setComments([reply, ...comments]);
        setNewComment('');
    };
    
    if (!post) {
        return <div className="flex items-center justify-center h-screen">Post not found.</div>;
    }

    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center gap-4 px-4 py-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold">Post</h1>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto">
                <div className="p-4 border-b">
                    <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={post.avatar} alt={post.handle} />
                            <AvatarFallback>{post.avatarFallback}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-bold">{post.author}</p>
                            <p className="text-sm text-muted-foreground">{post.handle}</p>
                        </div>
                    </div>
                    <p className="text-xl mb-4">{post.content}</p>
                    {post.image && (
                        <Image src={post.image} data-ai-hint={post.imageHint} width={500} height={300} alt="Post image" className="rounded-2xl border mb-4" />
                    )}
                    <p className="text-sm text-muted-foreground">{post.time}</p>
                    <Separator className="my-4" />
                    <div className="flex gap-4 text-sm text-muted-foreground">
                        <p><span className="font-bold text-foreground">{post.retweets}</span> Retweets</p>
                        <p><span className="font-bold text-foreground">{post.likes}</span> Likes</p>
                        <p><span className="font-bold text-foreground">{post.views}</span> Views</p>
                    </div>
                    <Separator className="my-4" />
                    <div className="flex justify-around text-muted-foreground">
                        <Button variant="ghost" size="icon" className="h-9 w-9"><MessageCircle className="h-5 w-5" /></Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9"><Repeat className="h-5 w-5" /></Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9"><Heart className="h-5 w-5" /></Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9"><Upload className="h-5 w-5" /></Button>
                    </div>
                </div>
                
                <div className="p-4 border-b">
                     <div className="flex gap-4">
                        <Avatar>
                            <AvatarImage src="https://placehold.co/40x40.png" alt="@barbie" />
                            <AvatarFallback>B</AvatarFallback>
                        </Avatar>
                        <div className="w-full">
                            <Textarea 
                                placeholder="Post your reply" 
                                className="bg-transparent border-none text-lg focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                            />
                            <div className="flex justify-end mt-2 border-t pt-2">
                                <Button onClick={handleReply} disabled={!newComment.trim()}>Reply</Button>
                            </div>
                        </div>
                    </div>
                </div>

                <ul className="divide-y divide-border">
                    {comments.map((comment) => (
                        <li key={comment.id} className="p-4">
                            <div className="flex gap-4">
                                <Avatar>
                                    <AvatarImage src={comment.avatar} alt={comment.handle} />
                                    <AvatarFallback>{comment.avatarFallback}</AvatarFallback>
                                </Avatar>
                                <div className='w-full'>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold">{comment.author}</p>
                                            <p className="text-sm text-muted-foreground">{comment.handle} · {comment.time}</p>
                                        </div>
                                         <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </div>
                                    <p>{comment.content}</p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </main>
        </div>
    );
}
