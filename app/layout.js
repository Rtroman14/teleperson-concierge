import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import localFont from "next/font/local";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata = {
    title: "Teleperson Concierge",
    description: "Your personal AI Concierge",
};

const clashDisplay = localFont({
    src: [
        {
            path: "./fonts/ClashDisplay-Variable.woff2",
            style: "normal",
        },
    ],
    variable: "--font-clash-display",
});

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} ${clashDisplay.variable} antialiased`}
            >
                {children}
            </body>
        </html>
    );
}
