import './globals.css';

export const metadata = {
  title: 'My App',
  description: 'A brief description of my app',
};

export default function Layout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}