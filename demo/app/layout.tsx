import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Porto Superchain Demo',
  description: 'One Permission, Multiple Chains - Experience seamless multi-chain DeFi with Porto + Superchain',
  keywords: ['Porto', 'Superchain', 'DeFi', 'Cross-chain', 'EIP-7702', 'L2', 'Multi-chain'],
  authors: [{ name: 'Porto Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#6366f1',
  openGraph: {
    title: 'Porto Superchain Demo',
    description: 'Experience seamless multi-chain DeFi operations with Porto + Superchain',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Porto Superchain Demo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Porto Superchain Demo',
    description: 'One Permission, Multiple Chains',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
        
        {/* Demo Controls (Hidden by default) */}
        <div id="demo-controls" className="fixed bottom-4 right-4 z-50 hidden">
          <div className="bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg text-sm">
            <div className="flex items-center space-x-4">
              <span>Demo Controls:</span>
              <span>ESC: Skip</span>
              <span>Space: Pause</span>
              <span>R: Restart</span>
            </div>
          </div>
        </div>

        {/* Keyboard shortcuts handler */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('keydown', function(e) {
                if (e.key === 'F1') {
                  e.preventDefault();
                  document.getElementById('demo-controls').classList.toggle('hidden');
                }
              });
            `,
          }}
        />
      </body>
    </html>
  )
} 