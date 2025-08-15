
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoreHorizontal, Search, Settings, MessageCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { collection, getDocs, query, where, limit, orderBy, doc, updateDoc, arrayUnion, arrayRemove, writeBatch, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';


interface Trend {
  rank: number;
  category: string;
  topic: string;
  posts: string;
}

interface UserSearchResult {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
    bio: string;
    followers?: string[];
}

interface PostSearchResult {
    id: string;
    author: string;
    handle: string;
    content: string;
}


export default function SearchPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('trending');
  const [trends, setTrends] = useState<Trend[]>([]);
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [newUsers, setNewUsers] = useState<UserSearchResult[]>([]);
  const [posts, setPosts] = useState<PostSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const fetchTrends = useCallback(async () => {
    setIsLoading(true);
    const trendsQuery = query(collection(db, 'trends'), orderBy('rank'), limit(10));
    try {
        const snapshot = await getDocs(trendsQuery);
        const trendsData = snapshot.docs.map(doc => doc.data() as Trend);
        setTrends(trendsData);
    } catch (error) {
        console.error("Error fetching trends:", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrends();

    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserSearchResult));
        setNewUsers(usersData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching new users:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [fetchTrends]);
  
  useEffect(() => {
      const performSearch = async (term: string) => {
          if (!term.trim()) {
              setUsers([]);
              setPosts([]);
              return;
          }
          setIsSearching(true);
          
          try {
              const userQuery = query(collection(db, 'users'), where('displayName', '>=', term), where('displayName', '<=', term + '\uf8ff'), limit(5));
              const postQuery = query(collection(db, 'posts'), where('content', '>=', term), where('content', '<=', term + '\uf8ff'), limit(5));

              const [userSnapshot, postSnapshot] = await Promise.all([
                  getDocs(userQuery),
                  getDocs(postQuery)
              ]);
              
              const usersData = userSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserSearchResult));
              const postsData = postSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as PostSearchResult);
              
              setUsers(usersData);
              setPosts(postsData);

          } catch (error) {
              console.error("Error searching:", error);
          } finally {
            setIsSearching(false);
          }
      };

      performSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  const handleFollow = async (targetUserId: string) => {
      if (!currentUser) return;
      
      const currentUserRef = doc(db, 'users', currentUser.uid);
      const targetUserRef = doc(db, 'users', targetUserId);

      const isFollowing = newUsers.find(u => u.uid === targetUserId)?.followers?.includes(currentUser.uid);

      const batch = writeBatch(db);

      if (isFollowing) {
          batch.update(currentUserRef, { following: arrayRemove(targetUserId) });
          batch.update(targetUserRef, { followers: arrayRemove(currentUser.uid) });
      } else {
          batch.update(currentUserRef, { following: arrayUnion(targetUserId) });
          batch.update(targetUserRef, { followers: arrayUnion(currentUser.uid) });
      }
      
      await batch.commit();
  };

  const filteredTrends = useMemo(() => {
    if (!searchTerm) return trends;
    return trends.filter(trend => 
      trend.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trend.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, trends]);


  const renderSearchResults = () => {
    if (isSearching) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (users.length === 0 && posts.length === 0) {
        return <div className="text-center p-8 text-muted-foreground">No results for &quot;{debouncedSearchTerm}&quot;</div>
    }

    return (
        <Tabs defaultValue="top" className="w-full">
            <TabsList className="w-full justify-around rounded-none bg-transparent border-b">
                <TabsTrigger value="top" className="flex-1">Top</TabsTrigger>
                <TabsTrigger value="people" className="flex-1">People</TabsTrigger>
                <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
            </TabsList>
            <TabsContent value="top">
                {users.length > 0 && (
                    <div className="border-b">
                        <h3 className="font-bold text-xl p-4">People</h3>
                        {users.map((user) => (
                            <div key={user.uid} className="p-4 hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/profile/${user.uid}`)}>
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-12 w-12"><AvatarImage src={user.avatar} /><AvatarFallback>{user.displayName[0]}</AvatarFallback></Avatar>
                                    <div>
                                        <p className="font-bold">{user.displayName}</p>
                                        <p className="text-sm text-muted-foreground">{user.handle}</p>
                                        <p className="text-sm mt-1">{user.bio}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {posts.length > 0 && (
                    <div>
                        <h3 className="font-bold text-xl p-4">Posts</h3>
                        <ul className="divide-y divide-border">
                        {posts.map((post) => (
                            <li key={post.id} className="p-4 hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground"><MessageCircle className="h-4 w-4" /> Post from {post.handle}</div>
                                <p className="mt-1">{post.content}</p>
                            </li>
                        ))}
                    </ul>
                    </div>
                )}
            </TabsContent>
            <TabsContent value="people">
                    <ul className="divide-y divide-border">{users.map((user) => (
                        <li key={user.uid} className="p-4 hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/profile/${user.uid}`)}>
                            <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12"><AvatarImage src={user.avatar} /><AvatarFallback>{user.displayName[0]}</AvatarFallback></Avatar>
                                <div>
                                    <p className="font-bold">{user.displayName}</p>
                                    <p className="text-sm text-muted-foreground">{user.handle}</p>
                                    <p className="text-sm mt-1">{user.bio}</p>
                                </div>
                            </div>
                        </li>
                    ))}</ul>
            </TabsContent>
            <TabsContent value="posts">
                    <ul className="divide-y divide-border">{posts.map((post) => (
                        <li key={post.id} className="p-4 hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground"><MessageCircle className="h-4 w-4" /> Post from {post.handle}</div>
                            <p className="mt-1">{post.content}</p>
                        </li>
                    ))}</ul>
            </TabsContent>
        </Tabs>
    );
  }

  const renderDefaultContent = () => {
    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-around rounded-none bg-transparent border-b sticky top-0 bg-background/80 backdrop-blur-sm z-10 px-4">
              <TabsTrigger value="for-you" className="flex-1">For you</TabsTrigger>
              <TabsTrigger value="trending" className="flex-1">Trending</TabsTrigger>
              <TabsTrigger value="news" className="flex-1">News</TabsTrigger>
              <TabsTrigger value="new-users" className="flex-1">New Users</TabsTrigger>
            </TabsList>
            <TabsContent value="for-you" className="mt-0">
                <div className="p-8 text-center text-muted-foreground">Personalized content coming soon!</div>
            </TabsContent>
            <TabsContent value="trending" className="mt-0">
                {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ): (
                <ul className="divide-y divide-border">
                {filteredTrends.map((trend) => (
                    <li key={trend.rank} className="p-4 hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{trend.rank} · {trend.category}</p>
                                <p className="font-bold">{trend.topic}</p>
                                <p className="text-sm text-muted-foreground">{trend.posts} posts</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        </div>
                    </li>
                ))}
                </ul>
                )}
            </TabsContent>
            <TabsContent value="news" className="mt-0">
                 <div className="p-8 text-center text-muted-foreground">News feed coming soon!</div>
            </TabsContent>
            <TabsContent value="new-users" className="mt-0">
                {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                    <ul className="divide-y divide-border">
                        {newUsers.map((user) => {
                            const isFollowing = user.followers?.includes(currentUser?.uid || '');
                            return (
                                <li key={user.uid} className="p-4 hover:bg-muted/50">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => router.push(`/profile/${user.uid}`)}>
                                            <Avatar className="h-12 w-12"><AvatarImage src={user.avatar} /><AvatarFallback>{user.displayName[0]}</AvatarFallback></Avatar>
                                            <div>
                                                <p className="font-bold">{user.displayName}</p>
                                                <p className="text-sm text-muted-foreground">{user.handle}</p>
                                            </div>
                                        </div>
                                        {currentUser?.uid !== user.uid && (
                                            <Button variant={isFollowing ? 'secondary' : 'default'} onClick={() => handleFollow(user.uid)}>
                                                {isFollowing ? 'Following' : 'Follow'}
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </TabsContent>
        </Tabs>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2 gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search" 
              className="w-full rounded-full bg-muted pl-10" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Settings className="h-6 w-6" />
        </div>
      </header>
      {debouncedSearchTerm ? renderSearchResults() : renderDefaultContent()}
    </>
  );
}
