import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SuiProvider from "../components/SuiProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SUI Freelance Marketplace",
  description:
    "A decentralized freelance marketplace built on SUI blockchain with progressive escrow system",
  keywords: [
    "freelance",
    "blockchain",
    "SUI",
    "marketplace",
    "smart contracts",
    "escrow",
  ],
  authors: [{ name: "SUI Marketplace Team" }],
  openGraph: {
    title: "SUI Freelance Marketplace",
    description:
      "A decentralized freelance marketplace built on SUI blockchain",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SUI Freelance Marketplace",
    description:
      "A decentralized freelance marketplace built on SUI blockchain",
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <meta name="theme-color" content="#1F2937" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body
        className={`${inter.className} bg-dark-900 text-dark-100 antialiased`}
      >
        {/* Background Effects */}
        <div className="fixed inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 -z-10" />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent-blue/5 via-transparent to-accent-purple/5 -z-10" />

        {/* SUI Provider Wrapper */}
        <SuiProvider>
          <div className="relative min-h-screen">
            {/* Global Loading Indicator */}
            <div id="global-loading" className="hidden">
              <div className="fixed inset-0 bg-dark-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-accent-blue border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-dark-200">
                      Processing transaction...
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <main className="relative z-10">{children}</main>

            {/* Global Toast Container */}
            <div
              id="toast-container"
              className="fixed top-4 right-4 z-50 space-y-2"
            >
              {/* Toast notifications will be rendered here */}
            </div>

            {/* Footer */}
            <footer className="mt-auto py-8 border-t border-dark-700/50 bg-dark-900/50 backdrop-blur-sm">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {/* Brand */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-accent-blue to-accent-purple rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">S</span>
                      </div>
                      <span className="font-bold text-dark-100">
                        SUI Marketplace
                      </span>
                    </div>
                    <p className="text-dark-400 text-sm">
                      Decentralized freelance marketplace built on SUI
                      blockchain with progressive escrow system.
                    </p>
                  </div>

                  {/* Platform */}
                  <div>
                    <h4 className="font-semibold text-dark-100 mb-4">
                      Platform
                    </h4>
                    <ul className="space-y-2 text-sm text-dark-400">
                      <li>
                        <a
                          href="#"
                          className="hover:text-accent-blue transition-colors"
                        >
                          How it Works
                        </a>
                      </li>
                      <li>
                        <a
                          href="#"
                          className="hover:text-accent-blue transition-colors"
                        >
                          For Freelancers
                        </a>
                      </li>
                      <li>
                        <a
                          href="#"
                          className="hover:text-accent-blue transition-colors"
                        >
                          For Clients
                        </a>
                      </li>
                      <li>
                        <a
                          href="#"
                          className="hover:text-accent-blue transition-colors"
                        >
                          Smart Contracts
                        </a>
                      </li>
                    </ul>
                  </div>

                  {/* Support */}
                  <div>
                    <h4 className="font-semibold text-dark-100 mb-4">
                      Support
                    </h4>
                    <ul className="space-y-2 text-sm text-dark-400">
                      <li>
                        <a
                          href="#"
                          className="hover:text-accent-blue transition-colors"
                        >
                          Help Center
                        </a>
                      </li>
                      <li>
                        <a
                          href="#"
                          className="hover:text-accent-blue transition-colors"
                        >
                          Documentation
                        </a>
                      </li>
                      <li>
                        <a
                          href="#"
                          className="hover:text-accent-blue transition-colors"
                        >
                          API Reference
                        </a>
                      </li>
                      <li>
                        <a
                          href="#"
                          className="hover:text-accent-blue transition-colors"
                        >
                          Contact Us
                        </a>
                      </li>
                    </ul>
                  </div>

                  {/* Legal */}
                  <div>
                    <h4 className="font-semibold text-dark-100 mb-4">Legal</h4>
                    <ul className="space-y-2 text-sm text-dark-400">
                      <li>
                        <a
                          href="#"
                          className="hover:text-accent-blue transition-colors"
                        >
                          Terms of Service
                        </a>
                      </li>
                      <li>
                        <a
                          href="#"
                          className="hover:text-accent-blue transition-colors"
                        >
                          Privacy Policy
                        </a>
                      </li>
                      <li>
                        <a
                          href="#"
                          className="hover:text-accent-blue transition-colors"
                        >
                          Cookie Policy
                        </a>
                      </li>
                      <li>
                        <a
                          href="#"
                          className="hover:text-accent-blue transition-colors"
                        >
                          Disclaimer
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-dark-700/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <p className="text-dark-400 text-sm">
                    © 2024 SUI Marketplace. Built with ❤️ on SUI blockchain.
                  </p>
                  <div className="flex items-center gap-4">
                    <a
                      href="#"
                      className="text-dark-400 hover:text-accent-blue transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                      </svg>
                    </a>
                    <a
                      href="#"
                      className="text-dark-400 hover:text-accent-blue transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                      </svg>
                    </a>
                    <a
                      href="#"
                      className="text-dark-400 hover:text-accent-blue transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </SuiProvider>

        {/* Global Scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark')
              } else {
                document.documentElement.classList.remove('dark')
              }

              window.showGlobalLoading = () => {
                document.getElementById('global-loading')?.classList.remove('hidden');
              };

              window.hideGlobalLoading = () => {
                document.getElementById('global-loading')?.classList.add('hidden');
              };

              window.showToast = (message, type = 'info') => {
                const container = document.getElementById('toast-container');
                if (!container) return;

                const toast = document.createElement('div');
                const colors = {
                  success: 'bg-accent-green/20 border-accent-green/30 text-accent-green',
                  error: 'bg-accent-red/20 border-accent-red/30 text-accent-red',
                  warning: 'bg-accent-yellow/20 border-accent-yellow/30 text-accent-yellow',
                  info: 'bg-accent-blue/20 border-accent-blue/30 text-accent-blue'
                };

                toast.className = \`\${colors[type] || colors.info} p-4 rounded-lg border backdrop-blur-sm animate-in slide-in-from-right-full duration-300\`;
                toast.textContent = message;

                container.appendChild(toast);

                setTimeout(() => {
                  toast.classList.add('animate-out', 'slide-out-to-right-full');
                  setTimeout(() => container.removeChild(toast), 300);
                }, 5000);
              };
            `,
          }}
        />
      </body>
    </html>
  );
}
