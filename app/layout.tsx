import type { Metadata } from 'next'
import { ThemeProvider } from '@/lib/theme'
import { LayoutShell } from '@/components/layout/LayoutShell'
import './globals.css'

export const metadata: Metadata = {
  title: 'SnowPro Core Practice Quiz',
  description: 'Prepare for the Snowflake COF-C02 certification exam',
}

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                const t=localStorage.getItem('snowflake-quiz-theme')||'system';
                const r=t==='system'?(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):t;
                document.documentElement.classList.add(r);
              } catch(e) {}
            })();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <LayoutShell>{children}</LayoutShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
