
import { Skeleton } from "@/components/ui/skeleton";

export default function PostSkeleton() {
    return (
        <div className="flex gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="w-full space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="aspect-video w-full">
                   <Skeleton className="h-full w-full rounded-2xl" />
                </div>
            </div>
        </div>
    );
}
