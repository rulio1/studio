
'use client';

import { Dialog, DialogContent, DialogOverlay, DialogPortal, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { X, MessageCircle, Repeat, Heart, BarChart2, Upload, MoreHorizontal, BadgeCheck, Bird, MapPin } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useRouter } from 'next/navigation';
import { Separator } from './ui/separator';
import { useUserStore } from '@/store/user-store';
import { useMemo, useState, useEffect } from 'react';
import { doc, getDoc, collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, updateDoc, increment, arrayUnion, arrayRemove, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { formatTimeAgo } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { Textarea } from './ui/textarea';
import { Loader2 } from 'lucide-react';

// Simplified interfaces for viewer
interface Comment {
    id: string;
    authorId: string;
    avatar: string;
    avatarFallback: string;
    author: string;
    handle: string;
    content: string;
    createdAt: any;
    isVerified?: boolean;
}

interface PostForViewer {
    id: string;
    image?: string;
    gifUrl?: string;
    comments: number;
    retweets: string[];
    likes: string[];
    views: number;
    authorId: string;
    author: string;
    avatar: string;
    avatarFallback: string;
    handle: string;
    isVerified?: boolean;
    badgeTier?: 'bronze' | 'silver' | 'gold';
    createdAt: any;
    content: string;
    location?: string;
}

interface ImageViewerProps {
  post: PostForViewer | null;
  onOpenChange: (open: boolean) => void;
}

const badgeColors = {
    bronze: 'text-amber-600',
    silver: 'text-slate-400',
    gold: 'text-yellow-400'
};

const CommentItem = ({ comment }: { comment: Comment }) => {
    const router = useRouter();
    const [time, setTime] = useState('');

    useEffect(() => {
        if (comment.createdAt) {
          try {
            setTime(formatTimeAgo(comment.createdAt.toDate()));
          } catch(e) { setTime('agora'); }
        }
    }, [comment.createdAt]);

    return (
        <div className="flex gap-3 p-3">
            <Avatar className="h-8 w-8 cursor-pointer" onClick={() => router.push(`/profile/${comment.authorId}`)}>
                <AvatarImage src={comment.avatar} />
                <AvatarFallback>{comment.avatarFallback}</AvatarFallback>
            </Avatar>
            <div className="flex-1 bg-muted p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold">{comment.author}</span>
                    <span className="text-muted-foreground">{comment.handle} · {time}</span>
                </div>
                <p className="text-sm">{comment.content}</p>
            </div>
        </div>
    )
};

export default function ImageViewer({ post, onOpenChange }: ImageViewerProps) {
  const router = useRouter();
  const handleClose = () => onOpenChange(false);
  const src = post?.image || post?.gifUrl;
  const { zisprUser } = useUserStore();
  const [newComment, setNewComment] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (!post) return;

    const commentsQuery = query(collection(db, "comments"), where("postId", "==", post.id), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Comment));
      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [post]);

  const isZisprAccount = post?.handle === '@Zispr';
  const isRulio = post?.handle === '@Rulio';
  const isPostVerified = post?.isVerified || isRulio;
  const badgeColor = post?.badgeTier ? badgeColors[post.badgeTier] : 'text-primary';

  const timeFormatted = useMemo(() => {
      if (!post?.createdAt) return '';
      try {
        const date = post.createdAt.toDate();
        return formatTimeAgo(date);
      } catch(e) {
        return 'agora';
      }
  }, [post?.createdAt]);

  const handleReply = async () => {
    if (!newComment.trim() || !zisprUser || !post || isReplying) return;
    setIsReplying(true);
    // Simplified reply logic for viewer; a full implementation would match post detail page
    try {
        await addDoc(collection(db, "comments"), {
            postId: post.id,
            authorId: zisprUser.uid,
            author: zisprUser.displayName,
            handle: zisprUser.handle,
            avatar: zisprUser.avatar,
            avatarFallback: zisprUser.displayName[0],
            content: newComment,
            createdAt: serverTimestamp(),
            likes: [], retweets: [], comments: 0, views: 0,
        });
        await updateDoc(doc(db, 'posts', post.id), { comments: increment(1) });
        setNewComment('');
    } catch (e) {
        console.error("Error posting reply:", e);
    } finally {
        setIsReplying(false);
    }
  }

  return (
    <AnimatePresence>
      {post && src && (
        <Dialog open={!!post} onOpenChange={onOpenChange}>
          <DialogPortal>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <DialogOverlay className="bg-black/80" />
            </motion.div>
            <DialogContent
              className="bg-transparent border-0 p-0 h-screen w-screen max-w-full flex flex-col md:flex-row items-center justify-center outline-none"
              hideCloseButton={true}
            >
              <DialogHeader className="sr-only">
                  <DialogTitle>Visualizador de Mídia</DialogTitle>
              </DialogHeader>
                {/* Media Column */}
                <div className="relative flex-1 w-full h-full flex items-center justify-center p-4 md:p-8" onClick={handleClose}>
                    <motion.div
                        className="relative w-full h-full flex items-center justify-center"
                        drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.8}
                        onDragEnd={(event, info) => { if (Math.abs(info.offset.y) > 150) handleClose(); }}
                      >
                        <motion.div
                          className="relative w-full h-auto max-h-full"
                          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on image
                        >
                          <Image
                            src={src}
                            alt="Visualização de imagem em tela cheia"
                            width={1200} height={1200}
                            className="object-contain w-full h-auto max-h-[90vh] rounded-lg"
                            draggable={false}
                            unoptimized={!!post.gifUrl}
                          />
                        </motion.div>
                    </motion.div>
                </div>

                {/* Details Column */}
                <div className="hidden md:flex flex-col w-full max-w-sm h-full bg-background">
                    <header className="p-4 border-b">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/profile/${post.authorId}`)}>
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={post.avatar} alt={post.author} />
                                <AvatarFallback>{post.avatarFallback}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-bold flex items-center gap-1">
                                    {post.author}
                                    {isZisprAccount ? <Bird className="h-4 w-4 text-primary" /> : (isPostVerified && <BadgeCheck className={'h-6 w-6 ' + (isRulio ? 'text-white fill-primary' : badgeColor)} />)}
                                </p>
                                <p className="text-sm text-muted-foreground">{post.handle}</p>
                            </div>
                        </div>
                    </header>
                    <main className="flex-1 overflow-y-auto">
                        <div className="p-4 space-y-4">
                            <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                             {post.location && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span>{post.location}</span>
                                </div>
                            )}
                            <p className="text-sm text-muted-foreground">{timeFormatted}</p>
                            <Separator />
                            <div className="flex justify-around text-muted-foreground">
                                <div className="flex items-center gap-2"><MessageCircle className="h-5 w-5" /><span>{post.comments}</span></div>
                                <div className="flex items-center gap-2"><Repeat className="h-5 w-5" /><span>{post.retweets.length}</span></div>
                                <div className="flex items-center gap-2"><Heart className="h-5 w-5" /><span>{post.likes.length}</span></div>
                                <div className="flex items-center gap-2"><BarChart2 className="h-5 w-5" /><span>{post.views}</span></div>
                            </div>
                            <Separator />
                        </div>
                        <div className="space-y-1">
                            {comments.map(comment => <CommentItem key={comment.id} comment={comment} />)}
                        </div>
                    </main>
                    <footer className="p-2 border-t">
                        <div className="flex items-center gap-2 relative rounded-lg border bg-muted p-1">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={zisprUser?.avatar} />
                                <AvatarFallback>{zisprUser?.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                            <Textarea 
                                placeholder="Poste sua resposta" 
                                className="flex-1 bg-transparent text-sm p-1 resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 h-auto"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                rows={1}
                                disabled={isReplying}
                            />
                            <Button onClick={handleReply} disabled={!newComment.trim() || isReplying} size="sm" className="rounded-full self-end">
                                {isReplying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reply"}
                            </Button>
                        </div>
                    </footer>
                </div>

              {/* Mobile Footer and Close Button */}
              <div className="md:hidden">
                    <motion.div 
                        className="absolute top-0 left-0 right-0 p-2 flex justify-between items-center z-50"
                        initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                        <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-white/20 hover:text-white rounded-full h-10 w-10">
                            <X className="h-6 w-6" />
                            <span className="sr-only">Fechar</span>
                        </Button>
                    </motion.div>
                    <motion.div 
                        className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent"
                        initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                       <div className="flex justify-around text-white/80 max-w-sm mx-auto">
                            <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/10 hover:text-white"><MessageCircle className="h-5 w-5" /><span>{post.comments}</span></Button>
                            <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/10 hover:text-white"><Repeat className="h-5 w-5" /><span>{post.retweets.length}</span></Button>
                            <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/10 hover:text-white"><Heart className="h-5 w-5" /><span>{post.likes.length}</span></Button>
                            <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/10 hover:text-white"><Upload className="h-5 w-5" /></Button>
                        </div>
                    </motion.div>
                </div>
            </DialogContent>
          </DialogPortal>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
