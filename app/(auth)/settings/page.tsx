"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (status === "authenticated") {
      checkGoogleConnection();
    }
  }, [status, router]);

  const checkGoogleConnection = async () => {
    try {
      const res = await fetch("/api/user");
      if (res.ok) {
        const data = await res.json();
        setGoogleConnected(!!data.googleAccessToken);
      }
    } catch (err) {
      console.error("Error checking Google connection:", err);
    }
  };

  const connectGoogle = async () => {
    setConnecting(true);
    try {
      const result = await signIn("google", { redirect: false });
      if (result?.ok) {
        checkGoogleConnection();
      }
    } finally {
      setConnecting(false);
    }
  };

  const disconnectGoogle = async () => {
    try {
      await fetch("/api/user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google" }),
      });
      setGoogleConnected(false);
    } catch (err) {
      console.error("Error disconnecting Google:", err);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-violet-900 to-slate-900">
        <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-900 to-slate-900">
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">GenaSlide</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-all"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Profile Settings</h1>

        <div className="space-y-6">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {session.user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="text-white font-medium">{session.user?.name}</p>
                    <p className="text-white/60 text-sm">{session.user?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Connected Services</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">Google</p>
                    <p className="text-white/60 text-sm">
                      {googleConnected ? "Connected - Use Google Slides export" : "Connect to enable Google Slides export"}
                    </p>
                  </div>
                </div>
                {googleConnected ? (
                  <button
                    onClick={disconnectGoogle}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-all text-sm"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={connectGoogle}
                    disabled={connecting}
                    className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-xl transition-all text-sm disabled:opacity-50"
                  >
                    {connecting ? "Connecting..." : "Connect"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Danger Zone</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                <div>
                  <p className="text-white font-medium">Sign Out</p>
                  <p className="text-white/60 text-sm">Sign out of your account on this device</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-all text-sm"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
