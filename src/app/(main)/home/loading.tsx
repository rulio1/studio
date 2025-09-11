

import IconZispr from '@/components/icon-zispr';

export default function HomeLoading() {
    return (
        <div className="flex h-screen flex-col items-center justify-center bg-background">
            <IconZispr className="h-16 w-16 animate-pulse text-primary" />
        </div>
      );
}
