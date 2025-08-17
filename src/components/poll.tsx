
'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

interface PollProps {
    postId: string;
    options: string[];
    votes: number[];
    voters: Record<string, number>;
    currentUserId: string;
    onVote: (postId: string, optionIndex: number) => Promise<void>;
}

export default function Poll({ postId, options, votes, voters, currentUserId, onVote }: PollProps) {
    const [userVote, setUserVote] = useState<number | undefined>(voters[currentUserId]);
    const [totalVotes, setTotalVotes] = useState(0);

    useEffect(() => {
        setUserVote(voters[currentUserId]);
        setTotalVotes(votes.reduce((acc, cur) => acc + cur, 0));
    }, [voters, currentUserId, votes]);

    const handleVote = (index: number) => {
        if (userVote !== undefined) return;
        onVote(postId, index);
    };

    const hasVoted = userVote !== undefined;

    return (
        <div className="space-y-3 rounded-2xl border p-4">
            {options.map((option, index) => {
                const percentage = totalVotes > 0 ? (votes[index] / totalVotes) * 100 : 0;
                const isSelected = userVote === index;

                return (
                    <div key={index}>
                        {hasVoted ? (
                            <div className="relative">
                                <Progress value={percentage} className="h-8" />
                                <div className="absolute inset-0 flex items-center justify-between px-3 text-sm font-medium">
                                    <span className={isSelected ? 'text-primary-foreground' : 'text-foreground'}>{option}</span>
                                    <span className={isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}>{percentage.toFixed(0)}%</span>
                                </div>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                className="w-full justify-start h-8"
                                onClick={() => handleVote(index)}
                            >
                                {option}
                            </Button>
                        )}
                    </div>
                );
            })}
             <p className="text-xs text-muted-foreground">{totalVotes.toLocaleString()} votos</p>
        </div>
    );
}
