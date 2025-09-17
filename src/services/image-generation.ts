
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as htmlToImage from 'html-to-image';
import { PostShareCard } from '@/components/post-share-card';

// Ensure you have a font file in your project or use a path to it.
// The best approach is to have the font file locally.
const fontPath = `${process.env.NEXT_PUBLIC_APP_URL}/Inter-Regular.woff`;

interface PostData {
    author: string;
    handle: string;
    avatar: string;
    content: string;
    isVerified?: boolean;
    badgeTier?: 'bronze' | 'silver' | 'gold';
    createdAt: string; 
}

export async function generatePostImage(postData: PostData): Promise<string> {
    try {
        const font = await fetch(fontPath).then((res) => res.arrayBuffer());

        const cardHtml = renderToStaticMarkup(
            React.createElement(PostShareCard, postData)
        );

        // We create a "virtual" DOM element to render our HTML.
        // This is a server-side equivalent of document.createElement.
        const div = `
            <style>
                @font-face {
                    font-family: 'Inter';
                    src: url(data:font/woff;base64,${Buffer.from(font).toString('base64')}) format('woff');
                }
            </style>
            ${cardHtml}
        `;
        
        const dataUrl = await htmlToImage.toPng(div as any, {
            quality: 0.98,
            pixelRatio: 2,
            width: 400,
            height: 400, // height can be auto adjusted by the library based on content
            fontEmbedCSS: `@font-face { font-family: 'Inter'; src: url('${fontPath}') format('woff'); }`,
        });

        return dataUrl;
    } catch (error) {
        console.error("Error in generatePostImage:", error);
        throw new Error("Failed to generate post image on server.");
    }
}
