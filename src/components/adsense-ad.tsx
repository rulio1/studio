'use client';
import { useEffect } from 'react';

interface AdsenseAdProps {
  slot: string;
  format?: 'fluid' | 'auto';
  layoutKey?: string;
  className?: string;
}

export default function AdsenseAd({ slot, format = 'auto', layoutKey, className }: AdsenseAdProps) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <div key={slot} className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
        {...(layoutKey && { 'data-ad-layout-key': layoutKey })}
      ></ins>
    </div>
  );
}
