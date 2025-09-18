
'use client';

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoreHorizontal, Search, Settings, MessageCircle, Loader2, ArrowLeft, BadgeCheck, Bird } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { collection, getDocs, query, where, limit, orderBy, doc, updateDoc, arrayUnion, arrayRemove, writeBatch, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import SearchLoading from './loading';
import { motion } from 'framer-motion';
import { useUserStore } from '@/store/user-store';
import { useTranslation } from '@/hooks/use-translation';


interface Trend {
  name: string;
  count: number;
}

interface UserSearchResult {
    uid: string;
    displayName: string;
    handle: string;
    avatar: string;
    bio: string;
    followers?: string[];
    isVerified?: boolean;
    badgeTier?: 'bronze' | 'silver' | 'gold';
    notificationPreferences?: { [key: string]: boolean };
}

interface PostSearchResult {
    id: string;
    author: string;
    handle: string;
    content: string;
    avatar?: string;
    avatarFallback?: string;
}

const badgeColors = {
    bronze: 'text-amber-600',
    silver: 'text-slate-400',
    gold: 'text-yellow-400'
};

const PostContent = ({ content }: { content: string }) => {
    const router = useRouter();
    const parts = content.split(/(#\w+)/g);
    return (
        <p className="mt-1">
            {parts.map((part, index) => {
                if (part.startsWith('#')) {
                    const hashtag = part.substring(1);
                    return (
                        <a 
                            key={index} 
                            className="text-primary hover:underline"
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/search?q=%23${hashtag}`);
                            }}
                        >
                            {part}
                        </a>
                    );
                }
                return part;
            })}
        </p>
    );
};

function SearchPageClient() {
  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get('q') || '';
  const tabFromUrl = searchParams.get('tab');
  
  const [searchTerm, setSearchTerm] = useState(typeof queryFromUrl === 'string' ? queryFromUrl : '');
  const [trends, setTrends] = useState<Trend[]>([]);
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [newUsers, setNewUsers] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const { user: currentUser, zisprUser } = useUserStore();
  const [posts, setPosts] = useState<PostSearchResult[]>([]);
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'trending');


  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const fetchTrends = useCallback(() => {
    setIsLoading(true);
    const trendsQuery = query(collection(db, 'hashtags'), orderBy('count', 'desc'), limit(10));
    const unsubscribe = onSnapshot(trendsQuery, (snapshot) => {
        const trendsData = snapshot.docs.map(doc => doc.data() as Trend);
        setTrends(trendsData);
        setIsLoading(false);
    }, (error) => {
        console.error("Erro ao buscar tendências:", error);
        setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const fetchNewUsers = useCallback(() => {
    setIsLoading(true);
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs.map(doc => {
            const data = { uid: doc.id, ...doc.data() } as UserSearchResult
            if (data.handle === '@stefanysouza' || data.handle === '@ZisprUSA') {
                data.isVerified = true;
                data.badgeTier = 'silver';
            }
            return data;
        });
        setNewUsers(usersData);
        setIsLoading(false);
    }, (error) => {
        console.error("Erro ao buscar novos usuários:", error);
        setIsLoading(false);
    });

    return unsubscribe;
  }, []);


  useEffect(() => {
    const unsubTrends = fetchTrends();
    const unsubUsers = fetchNewUsers();
    return () => {
      unsubTrends();
      unsubUsers();
    };
  }, [fetchTrends, fetchNewUsers]);
  
  useEffect(() => {
      const performSearch = async (term: string) => {
          const formattedTerm = term.trim().toLowerCase();
          if (!formattedTerm) {
              setUsers([]);
              setPosts([]);
              return;
          }
          setIsSearching(true);
          
          try {
            if (formattedTerm.startsWith('#')) {
                // Hashtag search
                const hashtag = formattedTerm.substring(1);
                const postQuery = query(collection(db, 'posts'), where('hashtags', 'array-contains', hashtag), limit(20));
                const postSnapshot = await getDocs(postQuery);
                const postsData = postSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as PostSearchResult);
                setPosts(postsData);
                setUsers([]);
            } else {
                // User and text search
                const nameQuery = query(collection(db, 'users'), where('searchableDisplayName', '>=', formattedTerm), where('searchableDisplayName', '<=', formattedTerm + '\uf8ff'), limit(5));
                const handleQuery = query(collection(db, 'users'), where('searchableHandle', '>=', formattedTerm.replace('@', '')), where('searchableHandle', '<=', formattedTerm.replace('@', '') + '\uf8ff'), limit(5));
                
                const [nameSnapshot, handleSnapshot] = await Promise.all([
                    getDocs(nameQuery),
                    getDocs(handleQuery),
                ]);
                
                const nameUsers = nameSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserSearchResult));
                const handleUsers = handleSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserSearchResult));
                
                // Merge and remove duplicates
                const allUsers = [...nameUsers, ...handleUsers];
                const uniqueUsers = Array.from(new Map(allUsers.map(user => [user.uid, user])).values());

                const finalUsers = uniqueUsers.map(user => {
                    if (user.handle === '@stefanysouza' || user.handle === '@ZisprUSA') {
                        user.isVerified = true;
                        user.badgeTier = 'silver';
                    }
                    return user;
                });
                
                setUsers(finalUsers);
                setPosts([]); // Clear posts when not searching for hashtags
            }

          } catch (error) {
              console.error("Erro na busca:", error);
          } finally {
            setIsSearching(false);
          }
      };

      if (debouncedSearchTerm) {
        performSearch(debouncedSearchTerm);
        router.push(`/search?q=${debouncedSearchTerm}`);
      }
  }, [debouncedSearchTerm, router]);

    const handleFollow = async (targetUser: UserSearchResult, listType: 'newUsers' | 'users') => {
        if (!currentUser || !zisprUser) return;
    
        const setList = listType === 'newUsers' ? setNewUsers : setUsers;
        const isCurrentlyFollowing = zisprUser.following?.includes(targetUser.uid) || false;
    
        // Optimistic UI update
        setList(prevList => prevList.map(u => {
            if (u.uid === targetUser.uid) {
                const newFollowers = isCurrentlyFollowing
                    ? u.followers?.filter(id => id !== currentUser.uid) || []
                    : [...(u.followers || []), currentUser.uid];
                return { ...u, followers: newFollowers };
            }
            return u;
        }));
    
        const batch = writeBatch(db);
        const currentUserRef = doc(db, 'users', currentUser.uid);
        const targetUserRef = doc(db, 'users', targetUser.uid);
    
        if (isCurrentlyFollowing) {
            batch.update(currentUserRef, { following: arrayRemove(targetUser.uid) });
            batch.update(targetUserRef, { followers: arrayRemove(currentUser.uid) });
        } else {
            batch.update(currentUserRef, { following: arrayUnion(targetUser.uid) });
            batch.update(targetUserRef, { followers: arrayUnion(targetUser.uid) });
    
            const prefs = targetUser.notificationPreferences;
            const canSendNotification = !prefs || prefs['follow'] !== false;

            if (canSendNotification) {
                const notificationRef = doc(collection(db, 'notifications'));
                batch.set(notificationRef, {
                    toUserId: targetUser.uid,
                    fromUserId: currentUser.uid,
                    fromUser: {
                        name: zisprUser.displayName,
                        handle: zisprUser.handle,
                        avatar: zisprUser.avatar,
                        isVerified: zisprUser.isVerified || false,
                        badgeTier: zisprUser.badgeTier || null
                    },
                    type: 'follow',
                    text: 'notifications.follow',
                    createdAt: serverTimestamp(),
                    read: false,
                });
            }
        }
    
        try {
            await batch.commit();
        } catch (error) {
            console.error("Error following user:", error);
            // Revert UI on error
             setList(prevList => prevList.map(u => {
                if (u.uid === targetUser.uid) {
                    return targetUser;
                }
                return u;
            }));
        }
    };


  const renderUser = (user: UserSearchResult, list: 'newUsers' | 'users') => {
    const isFollowing = zisprUser?.following?.includes(user.uid);
    const isZisprAccount = user.handle === '@Zispr' || user.handle === '@ZisprUSA';
    const isVerified = user.isVerified || user.handle === '@Rulio';
    const badgeColor = user.badgeTier ? badgeColors[user.badgeTier] : 'text-primary';


    if (currentUser?.uid === user.uid) {
        return (
            <li key={user.uid} className="p-4 hover:bg-muted/50">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => router.push(`/profile/${user.uid}`)}>
                        <Avatar className="h-12 w-12"><AvatarImage src={user.avatar} /><AvatarFallback>{user.displayName[0]}</AvatarFallback></Avatar>
                        <div>
                            <p className="font-bold flex items-center gap-1">
                                {user.displayName}
                                {isZisprAccount ? <Bird className="h-4 w-4 text-primary" /> : (isVerified && <BadgeCheck className={`h-4 w-4 ${badgeColor}`} />)}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.handle}</p>
                            <p className="text-sm mt-1">{user.bio}</p>
                        </div>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">{t('post.you')}</span>
                </div>
            </li>
        )
    }

    return (
        <li key={user.uid} className="p-4 hover:bg-muted/50">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => router.push(`/profile/${user.uid}`)}>
                    <Avatar className="h-12 w-12">
                        {isZisprAccount ? (
                             <div className="w-full h-full flex items-center justify-center rounded-full bg-primary/10">
                                <Bird className="h-6 w-6 text-primary" />
                            </div>
                        ) : (
                            <>
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                            </>
                        )}
                    </Avatar>
                    <div>
                        <p className="font-bold flex items-center gap-1">
                            {user.displayName}
                            {isZisprAccount ? <Bird className="h-4 w-4 text-primary" /> : (isVerified && <BadgeCheck className={`h-5 w-5 ${badgeColor}`} />)}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.handle}</p>
                        <p className="text-sm mt-1">{user.bio}</p>
                    </div>
                </div>
                 <Button variant={isFollowing ? 'secondary' : 'default'} onClick={() => handleFollow(user, list)}>
                    {isFollowing ? t('profile.buttons.following') : t('profile.buttons.follow')}
                </Button>
            </div>
        </li>
    );
  };

  const renderContent = () => {
    if (debouncedSearchTerm) {
         if (isSearching) {
            return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
        }

        if (users.length === 0 && posts.length === 0) {
            return <div className="text-center p-8 text-muted-foreground">{t('search.noResults', { term: debouncedSearchTerm })}</div>
        }

        return (
            <Tabs defaultValue="top" className="w-full">
                <div className="w-full justify-around rounded-none bg-transparent border-b sticky top-16 bg-background/80 backdrop-blur-sm z-10 p-2">
                    <TabsList className="relative grid w-full grid-cols-3 p-1 bg-muted/50 rounded-full h-11">
                        <TabsTrigger value="top" className="relative z-10 rounded-full text-base">{t('search.tabs.top')}</TabsTrigger>
                        <TabsTrigger value="people" className="relative z-10 rounded-full text-base">{t('search.tabs.people')}</TabsTrigger>
                        <TabsTrigger value="posts" className="relative z-10 rounded-full text-base">{t('search.tabs.posts')}</TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="top">
                    {users.length > 0 && (
                        <div className="border-b">
                            <h3 className="font-bold text-xl p-4">{t('search.tabs.people')}</h3>
                            <ul>
                            {users.map((user) => renderUser(user, 'users'))}
                            </ul>
                        </div>
                    )}
                    {posts.length > 0 && (
                        <div>
                            <h3 className="font-bold text-xl p-4">{t('search.tabs.posts')}</h3>
                            <ul className="divide-y divide-border">
                            {posts.map((post) => (
                                <li key={post.id} className="p-4 hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><MessageCircle className="h-4 w-4" /> {t('search.postBy')} {post.handle}</div>
                                    <PostContent content={post.content} />
                                </li>
                            ))}
                        </ul>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="people">
                        <ul className="divide-y divide-border">{users.map((user) => renderUser(user, 'users'))}</ul>
                </TabsContent>
                <TabsContent value="posts">
                        <ul className="divide-y divide-border">{posts.map((post) => (
                            <li key={post.id} className="p-4 hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground"><MessageCircle className="h-4 w-4" /> {t('search.postBy')} {post.handle}</div>
                                <PostContent content={post.content} />
                            </li>
                        ))}</ul>
                </TabsContent>
            </Tabs>
        );
    }
    
    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="w-full justify-around rounded-none bg-transparent border-b sticky top-16 bg-background/80 backdrop-blur-sm z-10 p-2">
              <TabsList className="relative grid w-full grid-cols-2 p-1 bg-muted/50 rounded-full h-11">
                  <TabsTrigger value="trending" className="relative z-10 rounded-full text-base">{t('search.tabs.trending')}</TabsTrigger>
                  <TabsTrigger value="new-users" className="relative z-10 rounded-full text-base">{t('search.tabs.newUsers')}</TabsTrigger>
                  <motion.div
                        layoutId="search-tab-indicator"
                        className="absolute inset-0 h-full p-1"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        style={{
                            left: activeTab === 'trending' ? '0%' : '50%',
                            right: activeTab === 'trending' ? '50%' : '0%',
                        }}
                    >
                        <div className="w-full h-full bg-background rounded-full shadow-md"></div>
                    </motion.div>
              </TabsList>
            </div>
            <TabsContent value="trending" className="mt-0">
                {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ): (
                <ul className="divide-y divide-border">
                {trends.map((trend, index) => (
                    <li key={trend.name} className="p-4 hover:bg-muted/50 cursor-pointer" onClick={() => setSearchTerm(`#${trend.name}`)}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{index + 1} · {t('search.trendingTopic')}</p>
                                <p className="font-bold">#{trend.name}</p>
                                <p className="text-sm text-muted-foreground">{trend.count.toLocaleString()} {t('profile.header.posts')}</p>
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
            <TabsContent value="new-users" className="mt-0">
                {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                    <ul className="divide-y divide-border">
                        {newUsers.map((user) => renderUser(user, 'newUsers'))}
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
              placeholder={t('search.placeholder')}
              className="w-full rounded-full bg-muted pl-10" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="ghost" size="icon" onClick={() => router.push('/settings')}><Settings className="h-6 w-6" /></Button>
        </div>
      </header>
      {renderContent()}
    </>
  );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<SearchLoading />}>
            <SearchPageClient />
        </Suspense>
    )
}

    
