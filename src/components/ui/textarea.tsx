import * as React from 'react';
import { useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import TextareaAutosize from 'react-textarea-autosize';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<typeof TextareaAutosize>>(
  ({ className, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);

    return (
      <TextareaAutosize
        className={cn(
          'flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none',
          className
        )}
        ref={internalRef}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
