import { fontVariables, inter } from '@/app/fonts';
import '@/app/tailwind.css';
import '@/app/styles/index.css';
import Script from 'next/script';
import type React from 'react';

export const metadata = {
  title: 'Astrofox',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === 'production' && (
          <Script
            defer
            data-website-id="2460afb4-6909-48f3-bf18-4f57e4bce408"
            data-domains="app.astrofox.io"
            src="/u.js"
          />
        )}
      </head>

      <body className={`${fontVariables} ${inter.className}`}>{children}</body>
    </html>
  );
}
