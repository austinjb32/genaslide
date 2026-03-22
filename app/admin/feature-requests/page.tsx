"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface FeatureRequest {
  id: string;
  email: string;
  message: string;
  status: string;
  createdAt: string;
}

export default function FeatureRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed" | "implemented">("all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/feature-request");
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      } else if (res.status === 403) {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    const updatedRequests = requests.map(r =>
      r.id === id ? { ...r, status: newStatus } : r
    );
    setRequests(updatedRequests);
  };

  const filteredRequests = requests.filter(r => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const statusCounts = {
    all: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    reviewed: requests.filter(r => r.status === "reviewed").length,
    implemented: requests.filter(r => r.status === "implemented").length,
  };

  if (status === "loading" || loading) {
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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Feature Requests</span>
          </div>

          <Link
            href="/dashboard"
            className="text-white/60 hover:text-white transition-colors text-sm"
          >
            Back to Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Feature Requests</h1>
          <p className="text-white/60">Review and manage user feature requests</p>
        </div>

        <div className="flex gap-2 mb-8">
          {(["all", "pending", "reviewed", "implemented"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl transition-all capitalize ${
                filter === status
                  ? "bg-purple-500 text-white"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              {status} ({statusCounts[status]})
            </button>
          ))}
        </div>

        {filteredRequests.length === 0 ? (
          <div className="bg-white/5 rounded-2xl p-12 text-center border border-white/10">
            <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-white/60">
              {filter === "all" ? "No feature requests yet" : `No ${filter} requests`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-white/60 text-sm">{request.email}</p>
                    <p className="text-white/40 text-xs mt-1">
                      {new Date(request.createdAt).toLocaleDateString()} at{" "}
                      {new Date(request.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateStatus(request.id, "reviewed")}
                      className={`px-3 py-1 rounded-lg border text-sm transition-all ${
                        request.status === "reviewed"
                          ? "bg-blue-500/30 border-blue-500/50 text-blue-300"
                          : "border-white/20 text-white/60 hover:border-blue-500/50 hover:text-blue-300"
                      }`}
                    >
                      Reviewed
                    </button>
                    <button
                      onClick={() => updateStatus(request.id, "implemented")}
                      className={`px-3 py-1 rounded-lg border text-sm transition-all ${
                        request.status === "implemented"
                          ? "bg-green-500/30 border-green-500/50 text-green-300"
                          : "border-white/20 text-white/60 hover:border-green-500/50 hover:text-green-300"
                      }`}
                    >
                      Implemented
                    </button>
                  </div>
                </div>
                <p className="text-white whitespace-pre-wrap">{request.message}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
