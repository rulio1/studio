
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { X, Heart, Repeat, MessageCircle, BarChart2, Users, Info } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface Post {
    id: string;
    authorId: string;
    avatar: string;
    avatarFallback: string;
    author: string;
    handle: string;
    time: string;
    content: string;
    createdAt: any;
    comments: number;
    retweets: string[];
    likes: string[];
    views: number;
    profileVisits?: number;
}

interface PostAnalyticsModalProps {
  post: Post | null;
  onOpenChange: (open: boolean) => void;
}

const StatItem = ({ value, label, tooltip }: { value: number; label: string; tooltip: string }) => (
    <div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>{label}</span>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Info className="h-3 w-3 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{tooltip}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
        <p className="text-3xl font-bold">{value.toLocaleString('pt-BR')}</p>
    </div>
);

export default function PostAnalyticsModal({ post, onOpenChange }: PostAnalyticsModalProps) {
  if (!post) return null;

  const interactions = post.likes.length + post.comments + post.retweets.length;

  return (
    <Dialog open={!!post} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 rounded-2xl bg-background sm:max-w-lg flex flex-col max-h-[80svh]">
        <DialogHeader className="p-4 flex flex-row items-center justify-between border-b">
          <DialogTitle className="text-xl font-bold">Atividade do Post</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <main className="px-6 pt-6 pb-6 flex-1 flex flex-col gap-4 overflow-y-auto">
            <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={post.avatar} alt={post.author} />
                    <AvatarFallback>{post.avatarFallback}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-bold">{post.author}</p>
                    <p className="text-sm text-muted-foreground">{post.handle}</p>
                </div>
            </div>
            <p className="text-muted-foreground whitespace-pre-wrap">{post.content}</p>
            <div className="flex justify-around text-muted-foreground p-4 border rounded-xl">
                 <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    <span>{post.likes.length}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Repeat className="h-5 w-5" />
                    <span>{post.retweets.length}</span>
                </div>
                <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    <span>{post.comments}</span>
                </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-y-6">
                <StatItem 
                    value={post.views} 
                    label="Impressões"
                    tooltip="O número de vezes que este post foi visto."
                />
                 <StatItem 
                    value={interactions}
                    label="Interações"
                    tooltip="O número total de vezes que os usuários interagiram com este post (curtidas, comentários, reposts)."
                />
                 <StatItem 
                    value={post.profileVisits || 0}
                    label="Visitas ao perfil"
                    tooltip="O número de vezes que o seu perfil foi visitado a partir deste post."
                />
            </div>
        </main>
      </DialogContent>
    </Dialog>
  );
}

