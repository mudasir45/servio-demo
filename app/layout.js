import './globals.css';
import ToastHost from '../components/ToastHost';

export const metadata = {
  title: 'Servio — Local Karigar, by Voice',
  description: 'Voice-first marketplace for local services in Depalpur and Okara.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
