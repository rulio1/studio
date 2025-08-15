
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, BarChart2, MessageCircle, Heart, Repeat, Upload, MoreHorizontal, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { format, formatDistanceToNow } from 'date-fns';

interface Post {
    id: string;
    authorId: string;
    avatar: string;
    avatarFallback: string;
    author: string;
    handle: string;
    time: string;
    createdAt: any;
    content: string;
    image?: string;
    imageHint?: string;
    comments: number;
    retweets: string[];
    likes: string[];
    views: number;
    isLiked: boolean;
    isRetweeted: boolean;
}

interface Comment {
    id: string;
    authorId: string;
    avatar: string;
    avatarFallback: string;
    author: string;
    handle: string;
    time: string;
    content: string;
}

interface ChirpUser {
    displayName: string;
    handle: string;
    avatar: string;
}

export default function PostDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { id } = params;
    
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isReplying, setIsReplying] = useState(false);
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [chirpUser, setChirpUser] = useState<ChirpUser | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists()) {
                    setChirpUser(userDoc.data() as ChirpUser);
                }
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (id) {
            const postId = id as string;
            const postRef = doc(db, "posts", postId);
            const unsubscribePost = onSnapshot(postRef, (doc) => {
                if (doc.exists()) {
                    const postData = doc.data() as Omit<Post, 'id' | 'isLiked' | 'isRetweeted' | 'time'>;
                    setPost({
                        id: doc.id,
                        ...postData,
                        time: postData.createdAt ? format(postData.createdAt.toDate(), "h:mm a · MMM d, yyyy") : '',
                        isLiked: postData.likes.includes(auth.currentUser?.uid || ''),
                        isRetweeted: postData.retweets.includes(auth.currentUser?.uid || ''),
                    });
                }
                setIsLoading(false);
            });

            // The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/chirp-3wj1h/firestore/indexes?create_composite=Ckxwcm9qZWN0cy9jaGlycC0zd2oxaC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvY29tbWVudHMvaW5kZXhlcy9fEAEaCgoGcG9zdElkEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg
            const commentsQuery = query(collection(db, "comments"), where("postId", "==", postId), orderBy("createdAt", "desc"));
            const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
                const commentsData = snapshot.docs.map(doc => {
                     const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        time: data.createdAt ? formatDistanceToNow(data.createdAt.toDate()) + ' ago' : 'just now',
                    } as Comment;
                });
                setComments(commentsData);
            });


            return () => {
                unsubscribePost();
                unsubscribeComments();
            };
        }
    }, [id]);

    const handleReply = async () => {
        if (!newComment.trim() || !user || !chirpUser || !id || isReplying) return;
        
        setIsReplying(true);
        try {
            await addDoc(collection(db, "comments"), {
                postId: id,
                authorId: user.uid,
                author: chirpUser.displayName,
                handle: chirpUser.handle,
                avatar: chirpUser.avatar,
                avatarFallback: chirpUser.displayName[0],
                content: newComment,
                createdAt: serverTimestamp(),
            });

            const postRef = doc(db, 'posts', id as string);
            await updateDoc(postRef, {
                comments: increment(1)
            });

            setNewComment('');
        } catch (error) {
            console.error("Error posting reply: ", error);
        } finally {
            setIsReplying(false);
        }
    };
    
    if (isLoading || !post) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
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
                        <Avatar className="h-12 w-12 cursor-pointer" onClick={() => router.push(`/profile/${post.authorId}`)}>
                            <AvatarImage src={post.avatar} alt={post.handle} />
                            <AvatarFallback>{post.avatarFallback}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-bold">{post.author}</p>
                            <p className="text-sm text-muted-foreground">{post.handle}</p>
                        </div>
                    </div>
                    <p className="text-xl mb-4 whitespace-pre-wrap">{post.content}</p>
                    {post.image && (
                        <Image src={post.image} data-ai-hint={post.imageHint} width={500} height={300} alt="Post image" className="rounded-2xl border mb-4" />
                    )}
                    <p className="text-sm text-muted-foreground">{post.time}</p>
                    <Separator className="my-4" />
                    <div className="flex gap-4 text-sm text-muted-foreground">
                        <p><span className="font-bold text-foreground">{post.comments}</span> {post.comments === 1 ? 'Comment' : 'Comments'}</p>
                        <p><span className="font-bold text-foreground">{post.retweets.length}</span> Retweets</p>
                        <p><span className="font-bold text-foreground">{post.likes.length}</span> Likes</p>
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
                            <AvatarImage src={chirpUser?.avatar} alt={chirpUser?.handle} />
                            <AvatarFallback>{chirpUser?.displayName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="w-full">
                            <Textarea 
                                placeholder="Post your reply" 
                                className="bg-transparent border-none text-lg focus-visible:ring-0 focus-visible:ring-offset-0 p-0 resize-none"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                rows={2}
                                disabled={isReplying}
                            />
                            <div className="flex justify-end mt-2 border-t pt-2">
                                <Button onClick={handleReply} disabled={!newComment.trim() || isReplying}>
                                    {isReplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Reply
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <ul className="divide-y divide-border">
                    {comments.map((comment) => (
                        <li key={comment.id} className="p-4 hover:bg-muted/20 transition-colors duration-200 cursor-pointer" onClick={() => router.push(`/profile/${comment.authorId}`)}>
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
                                    <p className="whitespace-pre-wrap">{comment.content}</p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </main>
        </div>
    );
}
