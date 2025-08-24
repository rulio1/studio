'use client';

import React from 'react';
import { Card } from './ui/card';

interface SpotifyEmbedProps {
  url: string;
}

const SpotifyEmbed = ({ url }: SpotifyEmbedProps) => {
  try {
    const urlObject = new URL(url);
    const pathParts = urlObject.pathname.split('/');
    
    // Path for track: /track/{id}
    // Path for album: /album/{id}
    // Path for artist: /artist/{id}
    const type = pathParts[1];
    const id = pathParts[2];

    if (!['track', 'album', 'artist'].includes(type) || !id) {
      return null;
    }

    const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;

    return (
      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
        <iframe
          src={embedUrl}
          width="100%"
          height="152"
          allowFullScreen={false}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ borderRadius: '12px' }}
        ></iframe>
      </div>
    );
  } catch (error) {
    console.error("Invalid Spotify URL", error);
    return null;
  }
};

export default SpotifyEmbed;
