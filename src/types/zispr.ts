
export interface ZisprUser {
    uid: string;
    displayName: string;
    email: string;
    handle: string;
    avatar: string;
    banner: string;
    bio: string;
    location: string;
    website: string;
    birthDate: Date | null;
    followers: string[];
    following: string[];
    collections?: Collection[];
    pinnedPostId?: string;
    isVerified?: boolean;
    badgeTier?: 'bronze' | 'silver' | 'gold';
    notificationPreferences?: {
        [key: string]: boolean;
    };
}

export interface Collection {
    id: string;
    name: string;
    postIds: string[];
}
