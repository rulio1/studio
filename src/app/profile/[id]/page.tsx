
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, Gift, Loader2, Mail, MapPin, MoreHorizontal, Search, Repeat, Heart, MessageCircle, BarChart2, Upload } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, arrayUnion, arrayRemove, onSnapshot, DocumentData, QuerySnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { format, formatDistanceToNow } from 'date-fns';
import PostSkeleton from '@/components/post-skeleton';

const EmptyState = ({ title, description }: { title: string, description: string }) => (
    <div className="text-center p-8">
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-muted-foreground mt-2">{description}</p>
    </div>
);

interface Post {
    id: string;
    authorId: string;
    avatar: string;
    avatarFallback: string;
    author: string;
    handle: string;
    time: string;
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

interface ChirpUser {
    uid: string;
    displayName: string;
    email: string;
    handle: string;
    avatar: string;
    banner: string;
    bio: string;
    location: string;
    website: string;
    birthDate: any;
    createdAt: any;
    followers: string[];
    following: string[];
}

export default function ProfilePage() {
    const router = useRouter();
    const params = useParams();
    const profileId = params.id as string;

    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [profileUser, setProfileUser] = useState<ChirpUser | null>(null);
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [likedPosts, setLikedPosts] = useState<Post[]>([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);
    const [isLoadingLikes, setIsLoadingLikes] = useState(true);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const fetchProfileUser = useCallback(async () => {
        if (!profileId) return;
        setIsLoading(true);
        const userDocRef = doc(db, 'users', profileId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data() as ChirpUser;
            setProfileUser(userData);
            if(currentUser){
                const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
                setIsFollowing(currentUserDoc.data()?.following?.includes(profileId));
            }
        } else {
            console.error("No such user!");
            // router.push('/home');
        }
        setIsLoading(false);
    }, [profileId, currentUser]);

    useEffect(() => {
        fetchProfileUser();
    }, [fetchProfileUser]);
    
    const fetchUserPosts = useCallback(async () => {
        if (!profileId) return;
        setIsLoadingPosts(true);
        const q = query(collection(db, "posts"), where("authorId", "==", profileId), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const posts = snapshot.docs.map(doc => {
             const data = doc.data();
             return {
                id: doc.id,
                ...data,
                time: data.createdAt ? formatDistanceToNow(data.createdAt.toDate()) + ' ago' : 'Just now',
                isLiked: data.likes.includes(currentUser?.uid || ''),
                isRetweeted: data.retweets.includes(currentUser?.uid || ''),
             } as Post
        });
        setUserPosts(posts);
        setIsLoadingPosts(false);
    }, [profileId, currentUser]);

    const fetchLikedPosts = useCallback(async () => {
        if (!profileId) return;
        setIsLoadingLikes(true);
        // The query requires an index. Temporarily removing the orderBy clause to prevent crashes.
        // The user should create the index in their Firebase console.
        const q = query(collection(db, "posts"), where("likes", "array-contains", profileId));
        const snapshot = await getDocs(q);
        const posts = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                time: data.createdAt ? formatDistanceToNow(data.createdAt.toDate()) + ' ago' : 'Just now',
                isLiked: data.likes.includes(currentUser?.uid || ''),
                isRetweeted: data.retweets.includes(currentUser?.uid || ''),
            } as Post
        });
        setLikedPosts(posts);
        setIsLoadingLikes(false);
    }, [profileId, currentUser]);


    useEffect(() => {
        fetchUserPosts();
        fetchLikedPosts();
    }, [fetchUserPosts, fetchLikedPosts]);

    const handleFollow = async () => {
        if (!currentUser || !profileUser) return;
        
        const currentUserRef = doc(db, 'users', currentUser.uid);
        const profileUserRef = doc(db, 'users', profileUser.uid);

        if (isFollowing) {
            // Unfollow
            await updateDoc(currentUserRef, { following: arrayRemove(profileUser.uid) });
            await updateDoc(profileUserRef, { followers: arrayRemove(currentUser.uid) });
        } else {
            // Follow
            await updateDoc(currentUserRef, { following: arrayUnion(profileUser.uid) });
            await updateDoc(profileUserRef, { followers: arrayUnion(currentUser.uid) });
        }
        setIsFollowing(!isFollowing);
        await fetchProfileUser();
    };

    const handlePostAction = async (postId: string, action: 'like' | 'retweet') => {
        // This is a simplified version, ideally you would refetch or update state more granularly
        const postRef = doc(db, 'posts', postId);
        const post = userPosts.find(p => p.id === postId) || likedPosts.find(p => p.id === postId);
        if (!post || !currentUser) return;

        if (action === 'like') {
            await updateDoc(postRef, {
                likes: post.isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
            });
        }
        fetchUserPosts();
        fetchLikedPosts();
    };

    const PostList = ({ posts, loading, emptyTitle, emptyDescription }: { posts: Post[], loading: boolean, emptyTitle: string, emptyDescription: string }) => {
        if (loading) {
            return (
                <ul>
                    <li className="p-4"><PostSkeleton /></li>
                    <li className="p-4"><PostSkeleton /></li>
                </ul>
            );
        }
        if (posts.length === 0) {
            return <EmptyState title={emptyTitle} description={emptyDescription} />;
        }
        return (
            <ul className="divide-y divide-border">
                {posts.map((post) => (
                    <li key={post.id} className="p-4 hover:bg-muted/20 transition-colors duration-200 cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
                        <div className="flex gap-4">
                             <Avatar onClick={(e) => {e.stopPropagation(); router.push(`/profile/${post.authorId}`)}}>
                                <AvatarImage src={post.avatar} alt={post.handle} />
                                <AvatarFallback>{post.avatarFallback}</AvatarFallback>
                            </Avatar>
                            <div className='w-full'>
                                <div className="flex items-center gap-2">
                                    <p className="font-bold">{post.author}</p>
                                    <p className="text-sm text-muted-foreground">{post.handle} · {post.time}</p>
                                </div>
                                <p className="mb-2">{post.content}</p>
                                {post.image && <Image src={post.image} data-ai-hint={post.imageHint} width={500} height={300} alt="Post image" className="rounded-2xl border" />}
                                <div className="mt-4 flex justify-between text-muted-foreground pr-4" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-1"><MessageCircle className="h-5 w-5 hover:text-primary transition-colors" /><span>{post.comments}</span></div>
                                    <button onClick={() => handlePostAction(post.id, 'retweet')} className={`flex items-center gap-1 ${post.isRetweeted ? 'text-green-500' : ''}`}><Repeat className="h-5 w-5 hover:text-green-500 transition-colors" /><span>{post.retweets.length}</span></button>
                                    <button onClick={() => handlePostAction(post.id, 'like')} className={`flex items-center gap-1 ${post.isLiked ? 'text-red-500' : ''}`}><Heart className={`h-5 w-5 hover:text-red-500 transition-colors ${post.isLiked ? 'fill-current' : ''}`} /><span>{post.likes.length}</span></button>
                                    <div className="flex items-center gap-1"><BarChart2 className="h-5 w-5" /><span>{post.views}</span></div>
                                    <div className="flex items-center gap-1"><Upload className="h-5 w-5" /></div>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        );
    };

    if (isLoading || !profileUser) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const isOwnProfile = currentUser?.uid === profileUser.uid;

  return (
    <div className="flex flex-col h-screen bg-background relative">
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="relative h-48 bg-muted">
          {profileUser.banner && <Image
            src={profileUser.banner}
            alt="Banner"
            layout="fill"
            objectFit="cover"
            data-ai-hint="concert crowd"
          />}
          <div className="absolute top-0 left-0 w-full h-full bg-black/30" />
          <div className="absolute top-4 left-4">
            <Button size="icon" variant="ghost" className="rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          <div className="absolute top-4 right-4 flex gap-2">
             <Button size="icon" variant="ghost" className="rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white">
              <Search className="h-5 w-5" />
            </Button>
             <Button size="icon" variant="ghost" className="rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="px-4">
            <div className="flex justify-between items-start">
                <div className="-mt-16">
                    <Avatar className="h-32 w-32 border-4 border-background">
                        <AvatarImage src={profileUser.avatar} data-ai-hint="pop star" alt={profileUser.displayName} />
                        <AvatarFallback>{profileUser.displayName[0]}</AvatarFallback>
                    </Avatar>
                </div>
                {isOwnProfile ? (
                    <Button variant="outline" className="rounded-full mt-4 font-bold" asChild>
                      <Link href="/profile/edit">Edit profile</Link>
                    </Button>
                ) : (
                    <div className='flex items-center gap-2 mt-4'>
                        <Button variant="ghost" size="icon" className="border rounded-full"><Mail /></Button>
                        <Button variant={isFollowing ? 'secondary' : 'default'} className="rounded-full font-bold" onClick={handleFollow}>
                            {isFollowing ? 'Following' : 'Follow'}
                        </Button>
                    </div>
                )}
            </div>
            <div className="mt-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">{profileUser.displayName}</h1>
                </div>
                <p className="text-muted-foreground">{profileUser.handle}</p>
                <p className="mt-2">{profileUser.bio}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-muted-foreground text-sm">
                {profileUser.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span>{profileUser.location}</span></div>}
                {profileUser.birthDate && <div className="flex items-center gap-2"><Gift className="h-4 w-4" /><span>Born {format(profileUser.birthDate.toDate(), 'MMMM d, yyyy')}</span></div>}
                {profileUser.createdAt && <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>Joined {format(profileUser.createdAt.toDate(), 'MMMM yyyy')}</span></div>}
            </div>
             <div className="flex gap-4 mt-4 text-sm">
                <p><span className="font-bold text-foreground">{profileUser.following?.length || 0}</span> Following</p>
                <p><span className="font-bold text-foreground">{profileUser.followers?.length || 0}</span> Followers</p>
            </div>
        </div>

        <Tabs defaultValue="posts" className="w-full mt-4">
            <TabsList className="w-full justify-start rounded-none bg-transparent border-b px-4 overflow-x-auto no-scrollbar">
                <TabsTrigger value="posts" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Posts</TabsTrigger>
                <TabsTrigger value="replies" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Replies</TabsTrigger>
                <TabsTrigger value="highlights" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Highlights</TabsTrigger>
                <TabsTrigger value="media" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Media</TabsTrigger>
                <TabsTrigger value="likes" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent">Likes</TabsTrigger>
            </TabsList>

             <TabsContent value="posts" className="mt-0">
                <PostList 
                    posts={userPosts} 
                    loading={isLoadingPosts} 
                    emptyTitle="No posts yet" 
                    emptyDescription="When this user posts, they will show up here."
                />
            </TabsContent>
            <TabsContent value="replies" className="mt-0">
                <EmptyState title="No replies yet" description="When someone replies to this user, it will show up here." />
            </TabsContent>
            <TabsContent value="highlights" className="mt-0">
                <EmptyState title="No highlights yet" description="This user's highlights will be displayed here." />
            </TabsContent>
            <TabsContent value="media" className="mt-0">
                 <EmptyState title="No media yet" description="When this user posts photos or videos, they will appear here." />
            </TabsContent>
            <TabsContent value="likes" className="mt-0">
                 <PostList 
                    posts={likedPosts} 
                    loading={isLoadingLikes}
                    emptyTitle="No likes yet" 
                    emptyDescription="When this user likes posts, they will appear here."
                 />
            </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
