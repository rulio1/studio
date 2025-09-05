'use client';

import { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';

export interface PollData {
    options: { id: number, text: string }[];
}

interface PollCreatorProps {
    onChange: (data: PollData | null) => void;
}

export default function PollCreator({ onChange }: PollCreatorProps) {
    const [options, setOptions] = useState([
        { id: 1, text: '' },
        { id: 2, text: '' }
    ]);
    const [nextId, setNextId] = useState(3);

    useEffect(() => {
        // Only call onChange if the poll is valid (at least 2 options with text)
        const validOptions = options.filter(o => o.text.trim() !== '');
        if (validOptions.length >= 2) {
            onChange({ options });
        } else {
            onChange(null);
        }
    }, [options, onChange]);


    const handleOptionChange = (id: number, text: string) => {
        setOptions(options.map(opt => opt.id === id ? { ...opt, text } : opt));
    };

    const addOption = () => {
        if (options.length < 4) {
            setOptions([...options, { id: nextId, text: '' }]);
            setNextId(nextId + 1);
        }
    };

    const removeOption = (id: number) => {
        if (options.length > 2) {
            setOptions(options.filter(opt => opt.id !== id));
        }
    };

    return (
        <div className="space-y-3 rounded-2xl border p-4 animate-fade-in">
            {options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                    <Input
                        placeholder={`Opção ${index + 1}`}
                        value={option.text}
                        onChange={(e) => handleOptionChange(option.id, e.target.value)}
                        maxLength={25}
                    />
                    {options.length > 2 && (
                         <Button variant="ghost" size="icon" onClick={() => removeOption(option.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    )}
                </div>
            ))}
            {options.length < 4 && (
                <Button variant="outline" size="sm" onClick={addOption} className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Opção
                </Button>
            )}
        </div>
    );
}
