
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoreHorizontal, Search, Settings, User, MessageCircle, Loader2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';


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
  const [posts, setPosts] = useState<PostSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  useEffect(() => {
    const fetchTrends = async () => {
        setIsLoading(true);
        const trendsQuery = query(collection(db, 'trends'), orderBy('rank'), limit(10));
        const snapshot = await getDocs(trendsQuery);
        const trendsData = snapshot.docs.map(doc => doc.data() as Trend);
        setTrends(trendsData);
        setIsLoading(false);
    };
    fetchTrends();
  }, []);

  const handleSearch = useCallback(async (term: string) => {
      if (!term.trim()) {
          setUsers([]);
          setPosts([]);
          if (activeTab !== 'trending') setActiveTab('trending');
          return;
      }
      setIsLoading(true);
      if (activeTab === 'trending') setActiveTab('top');
      try {
          const userQuery = query(collection(db, 'users'), where('displayName', '>=', term), where('displayName', '<=', term + '\uf8ff'), limit(5));
          const postQuery = query(collection(db, 'posts'), where('content', '>=', term), where('content', '<=', term + '\uf8ff'), limit(5));

          const [userSnapshot, postSnapshot] = await Promise.all([
              getDocs(userQuery),
              getDocs(postQuery)
          ]);
          
          const usersData = userSnapshot.docs.map(doc => doc.data() as UserSearchResult);
          const postsData = postSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as PostSearchResult);
          
          setUsers(usersData);
          setPosts(postsData);

      } catch (error) {
          console.error("Error searching:", error);
      }
      setIsLoading(false);
  }, [activeTab]);
  
  useEffect(() => {
      handleSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, handleSearch]);


  const filteredTrends = useMemo(() => {
    if (!searchTerm) return trends;
    return trends.filter(trend => 
      trend.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trend.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, trends]);


  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (searchTerm && activeTab !== 'trending') {
        return (
             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-around rounded-none bg-transparent border-b">
                    <TabsTrigger value="top" className="flex-1">Top</TabsTrigger>
                    <TabsTrigger value="people" className="flex-1">People</TabsTrigger>
                    <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
                </TabsList>
                <TabsContent value="top">
                    {users.length > 0 && (
                        <div className="border-b">
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
                         <ul className="divide-y divide-border">
                            {posts.map((post) => (
                                <li key={post.id} className="p-4 hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><MessageCircle className="h-4 w-4" /> Post from {post.handle}</div>
                                    <p className="mt-1">{post.content}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                    {users.length === 0 && posts.length === 0 && !isLoading && (
                        <div className="text-center p-8 text-muted-foreground">No results for &quot;{searchTerm}&quot;</div>
                    )}
                </TabsContent>
                <TabsContent value="people">
                     {users.length > 0 ? (
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
                     ) : <div className="text-center p-8 text-muted-foreground">No people found for &quot;{searchTerm}&quot;</div>}
                </TabsContent>
                <TabsContent value="posts">
                     {posts.length > 0 ? (
                         <ul className="divide-y divide-border">{posts.map((post) => (
                            <li key={post.id} className="p-4 hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground"><MessageCircle className="h-4 w-4" /> Post from {post.handle}</div>
                                <p className="mt-1">{post.content}</p>
                            </li>
                        ))}</ul>
                     ) : <div className="text-center p-8 text-muted-foreground">No posts found for &quot;{searchTerm}&quot;</div>}
                </TabsContent>
            </Tabs>
        )
    }

    return (
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
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2 gap-4">
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://placehold.co/40x40.png" alt="admin" />
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
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
        {!searchTerm && (
            <Tabs defaultValue="trending" className="w-full">
                <TabsList className="w-full justify-start rounded-none bg-transparent border-b px-4 gap-4 overflow-x-auto">
                <TabsTrigger value="for-you" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent px-0">For You</TabsTrigger>
                <TabsTrigger value="trending" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent px-0">Trending</TabsTrigger>
                <TabsTrigger value="news" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent px-0">News</TabsTrigger>
                <TabsTrigger value="sports" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent px-0">Sports</TabsTrigger>
                <TabsTrigger value="entertainment" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary bg-transparent px-0">Entertainment</TabsTrigger>
                </TabsList>
            </Tabs>
        )}
      </header>
      {renderContent()}
    </>
  );
}
