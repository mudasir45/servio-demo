import './globals.css';
import ToastHost from '../components/ToastHost';

export const metadata = {
  title: 'Servio — Local Karigar, by Voice',
  description: 'Voice-first marketplace for local services in Depalpur and Okara.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Same webfonts as the prototype: Plus Jakarta Sans + Noto Nastaliq Urdu */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
