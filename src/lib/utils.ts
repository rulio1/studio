
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper to convert data URI to File object
export function dataURItoFile(dataURI: string, filename: string): File {
    const arr = dataURI.split(',');
    if (arr.length < 2) {
        throw new Error('Invalid data URI');
    }
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Could not find MIME type in data URI');
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

export function fileToDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) {
    return Math.floor(interval) + "ano";
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + "mês";
  }
  interval = seconds / 604800;
  if (interval > 1) {
    return Math.floor(interval) + "sem";
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + "d";
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + "h";
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + "m";
  }
  return Math.floor(seconds) + "s";
}

export function extractSpotifyUrl(text: string): string | null {
    if (!text) return null;
    const spotifyRegex = /(https?:\/\/(?:open|play)\.spotify\.com\/(?:track|album|artist|playlist)\/[a-zA-Z0-9]+)/;
    const match = text.match(spotifyRegex);
    return match ? match[0] : null;
}
