
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's.yimg.com',
      },
      {
        protocol: 'https',
        hostname: 'media.zenfs.com',
      },
       {
        protocol: 'https',
        hostname: 'www.reuters.com',
      },
      {
        protocol: 'https',
        hostname: 'www.rfi.fr',
      },
      {
        protocol: 'https',
        hostname: 's.w-x.co',
      },
      {
        protocol: 'https',
        hostname: 'admin.cnnbrasil.com.br',
      },
      {
        protocol: 'https',
        hostname: 'www.cnnbrasil.com.br',
      },
      {
        protocol: 'https',
        hostname: 'www.band.uol.com.br',
      },
      {
        protocol: 'https',
        hostname: 'conteudo.imguol.com.br',
      },
      {
        protocol: 'https',
        hostname: 'classic.exame.com',
      },
       {
        protocol: 'https',
        hostname: 'www.otempo.com.br',
      },
      {
        protocol: 'https',
        hostname: 'static.poder360.com.br',
      },
      {
        protocol: 'https',
        hostname: 's2-oglobo.glbimg.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn-7.motorsport.com',
      },
      {
        protocol: 'https',
        hostname: 'www.lance.com.br',
      },
      {
        protocol: 'https',
        hostname: 'uploads.metropoles.com',
      },
      {
        protocol: 'https',
        hostname: 'img.nsctotal.com.br',
      }
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
