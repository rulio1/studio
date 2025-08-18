
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoreHorizontal, Search, Settings, MessageCircle, Loader2, ArrowLeft, BadgeCheck, Bird } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { collection, getDocs, query, where, limit, orderBy, doc, updateDoc, arrayUnion, arrayRemove, writeBatch, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';


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
}

interface PostSearchResult {
    id: string;
    author: string;
    handle: string;
    content: string;
    avatar?: string;
    avatarFallback?: string;
}

const forYouPosts: PostSearchResult[] = [
    {
        id: '1',
        author: 'Chirp',
        handle: '@chirp',
        content: 'Bem-vindo à nova aba "Para você"! Aqui você encontrará as últimas atualizações e novidades sobre o Chirp. #NovidadesChirp',
        avatar: '/logo.svg',
        avatarFallback: 'C',
    },
    {
        id: '2',
        author: 'Chirp',
        handle: '@chirp',
        content: 'Acabamos de lançar a busca por #hashtags! Agora você pode explorar tópicos e descobrir novos conteúdos com mais facilidade. Experimente!',
        avatar: '/logo.svg',
        avatarFallback: 'C',
    },
     {
        id: '3',
        author: 'Chirp',
        handle: '@chirp',
        content: 'Os "Tópicos do Momento" já estão funcionando! Fique de olho na aba de tendências para ver o que está bombando na plataforma. #Trending',
        avatar: '/logo.svg',
        avatarFallback: 'C',
    },
    {
        id: '4',
        author: 'Chirp',
        handle: '@chirp',
        content: 'Agora você pode postar com imagens! Dê vida aos seus posts e compartilhe seus momentos com mais cores. #ImagensNoChirp',
        avatar: '/logo.svg',
        avatarFallback: 'C',
    }
];

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

export default function SearchPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get('q');
  
  const [searchTerm, setSearchTerm] = useState(queryFromUrl || '');
  const [trends, setTrends] = useState<Trend[]>([]);
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [newUsers, setNewUsers] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [posts, setPosts] = useState<PostSearchResult[]>([]);


  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

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
        const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserSearchResult));
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
                setUsers(uniqueUsers);
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
      }
  }, [debouncedSearchTerm]);

  const handleFollow = async (targetUserId: string, list: 'newUsers' | 'users') => {
    if (!currentUser) return;

    const listToUpdate = list === 'newUsers' ? newUsers : users;
    const setList = list === 'newUsers' ? setNewUsers : setUsers;

    const targetUser = listToUpdate.find(u => u.uid === targetUserId);
    if (!targetUser) return;
    const isFollowing = targetUser.followers?.includes(currentUser.uid);

    const batch = writeBatch(db);
    const currentUserRef = doc(db, 'users', currentUser.uid);
    const targetUserRef = doc(db, 'users', targetUserId);
    
    if (isFollowing) {
        batch.update(currentUserRef, { following: arrayRemove(targetUserId) });
        batch.update(targetUserRef, { followers: arrayRemove(targetUserId) });
    } else {
        batch.update(currentUserRef, { following: arrayUnion(targetUserId) });
        batch.update(targetUserRef, { followers: arrayUnion(targetUserId) });
    }
    
    await batch.commit();

    // Optimistically update UI
    setList(listToUpdate.map(u => 
        u.uid === targetUserId 
            ? { ...u, followers: isFollowing ? u.followers?.filter(id => id !== currentUser.uid) : [...(u.followers || []), currentUser.uid] }
            : u
    ));
};

  const filteredTrends = useMemo(() => {
    if (!searchTerm) return trends;
    return trends.filter(trend => 
      trend.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, trends]);

  const renderUser = (user: UserSearchResult, list: 'newUsers' | 'users') => {
    const isFollowing = user.followers?.includes(currentUser?.uid || '');
    const isVerified = user.isVerified || user.handle === '@rulio';
    const isChirpAccount = user.handle === '@chirp';

    if (currentUser?.uid === user.uid) {
        return (
            <li key={user.uid} className="p-4 hover:bg-muted/50">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => router.push(`/profile/${user.uid}`)}>
                        <Avatar className="h-12 w-12"><AvatarImage src={user.avatar} /><AvatarFallback>{user.displayName[0]}</AvatarFallback></Avatar>
                        <div>
                            <p className="font-bold flex items-center gap-1">
                                {user.displayName}
                                {isChirpAccount ? <Bird className="h-4 w-4 text-primary" /> : (isVerified && <BadgeCheck className="h-4 w-4 text-primary" />)}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.handle}</p>
                            <p className="text-sm mt-1">{user.bio}</p>
                        </div>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">Você</span>
                </div>
            </li>
        )
    }

    return (
        <li key={user.uid} className="p-4 hover:bg-muted/50">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => router.push(`/profile/${user.uid}`)}>
                    <Avatar className="h-12 w-12">
                        {isChirpAccount ? (
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
                            {isChirpAccount ? <Bird className="h-4 w-4 text-primary" /> : (isVerified && <BadgeCheck className="h-4 w-4 text-primary" />)}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.handle}</p>
                        <p className="text-sm mt-1">{user.bio}</p>
                    </div>
                </div>
                 <Button variant={isFollowing ? 'secondary' : 'default'} onClick={() => handleFollow(user.uid, list)}>
                    {isFollowing ? 'Seguindo' : 'Seguir'}
                </Button>
            </div>
        </li>
    );
  };

  const renderOfficialPost = (post: PostSearchResult) => (
    <li key={post.id} className="p-4 hover:bg-muted/50 cursor-pointer" onClick={() => {
        if (post.content.includes('#hashtags')) {
            setSearchTerm('#hashtags');
        }
    }}>
        <div className="flex gap-4">
            <Avatar>
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <Bird className="h-5 w-5 text-primary" />
                </div>
            </Avatar>
            <div className="w-full">
                <div className="flex items-center gap-2 text-sm">
                    <p className="font-bold text-base flex items-center gap-1">
                        {post.author} 
                        <Bird className="h-4 w-4 text-primary" />
                    </p>
                    <p className="text-muted-foreground">{post.handle}</p>
                </div>
                <PostContent content={post.content} />
            </div>
        </div>
    </li>
  );


  const renderContent = () => {
    if (debouncedSearchTerm) {
         if (isSearching) {
            return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
        }

        if (users.length === 0 && posts.length === 0) {
            return <div className="text-center p-8 text-muted-foreground">Nenhum resultado para &quot;{debouncedSearchTerm}&quot;</div>
        }

        return (
            <Tabs defaultValue="top" className="w-full">
                <TabsList className="w-full justify-around rounded-none bg-transparent border-b">
                    <TabsTrigger value="top" className="flex-1">Principais</TabsTrigger>
                    <TabsTrigger value="people" className="flex-1">Pessoas</TabsTrigger>
                    <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
                </TabsList>
                <TabsContent value="top">
                    {users.length > 0 && (
                        <div className="border-b">
                            <h3 className="font-bold text-xl p-4">Pessoas</h3>
                            <ul>
                            {users.map((user) => renderUser(user, 'users'))}
                            </ul>
                        </div>
                    )}
                    {posts.length > 0 && (
                        <div>
                            <h3 className="font-bold text-xl p-4">Posts</h3>
                            <ul className="divide-y divide-border">
                            {posts.map((post) => (
                                <li key={post.id} className="p-4 hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><MessageCircle className="h-4 w-4" /> Post de {post.handle}</div>
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
                                <div className="flex items-center gap-2 text-sm text-muted-foreground"><MessageCircle className="h-4 w-4" /> Post de {post.handle}</div>
                                <PostContent content={post.content} />
                            </li>
                        ))}</ul>
                </TabsContent>
            </Tabs>
        );
    }
    
    return (
        <Tabs defaultValue="for-you" className="w-full">
            <TabsList className="w-full justify-around rounded-none bg-transparent border-b sticky top-0 bg-background/80 backdrop-blur-sm z-10 px-4">
              <TabsTrigger value="for-you" className="flex-1">Para você</TabsTrigger>
              <TabsTrigger value="trending" className="flex-1">Tópicos do momento</TabsTrigger>
              <TabsTrigger value="new-users" className="flex-1">Novos Usuários</TabsTrigger>
            </TabsList>
            <TabsContent value="for-you" className="mt-0">
                 <ul className="divide-y divide-border">
                    {forYouPosts.map(renderOfficialPost)}
                </ul>
            </TabsContent>
            <TabsContent value="trending" className="mt-0">
                {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ): (
                <ul className="divide-y divide-border">
                {filteredTrends.map((trend, index) => (
                    <li key={trend.name} className="p-4 hover:bg-muted/50 cursor-pointer" onClick={() => setSearchTerm(`#${trend.name}`)}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{index + 1} · Tópicos do momento</p>
                                <p className="font-bold">#{trend.name}</p>
                                <p className="text-sm text-muted-foreground">{trend.count.toLocaleString()} posts</p>
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
              placeholder="Buscar" 
              className="w-full rounded-full bg-muted pl-10" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Settings className="h-6 w-6" />
        </div>
      </header>
      {renderContent()}
    </>
  );
}
