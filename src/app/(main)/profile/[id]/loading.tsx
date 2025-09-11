
import { Bird } from 'lucide-react';

export default function ProfileLoading() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background">
        <Bird className="h-16 w-16 animate-pulse text-primary" />
    </div>
  );
}
