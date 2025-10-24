import '../styles/globals.css';

export const metadata = {
  title: 'FasterPost',
  description: 'Migrated from Pages Router to App Router',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
