"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Slide {
  id: number;
  title: string;
  content: string;
  layout: "title" | "content" | "two-column" | "quote";
  backgroundImage?: string;
}

interface Presentation {
  id?: string;
  title: string;
  topic?: string;
  slides: Slide[];
}

interface SavedPresentation {
  id: string;
  title: string;
  topic: string;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [savedPresentations, setSavedPresentations] = useState<SavedPresentation[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [loadingPresentations, setLoadingPresentations] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEnhanceModal, setShowEnhanceModal] = useState(false);
  const [enhancePrompt, setEnhancePrompt] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchPresentations();
    }
  }, [session]);

  const fetchPresentations = async () => {
    try {
      const res = await fetch("/api/presentations");
      if (res.ok) {
        const data = await res.json();
        setSavedPresentations(data);
      }
    } catch (err) {
      console.error("Error fetching presentations:", err);
    } finally {
      setLoadingPresentations(false);
    }
  };

  if (status === "loading" || loadingPresentations) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-violet-900 to-slate-900">
        <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate slides");
      }

      setPresentation(data);
      setCurrentSlide(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const savePresentation = async () => {
    if (!presentation) return;
    try {
      if (presentation.id) {
        const res = await fetch(`/api/presentations/${presentation.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: presentation.title,
            slides: presentation.slides,
          }),
        });
        if (res.ok) {
          fetchPresentations();
        }
      } else {
        const res = await fetch("/api/presentations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: presentation.title,
            topic: topic,
            slides: presentation.slides,
          }),
        });
        if (res.ok) {
          const saved = await res.json();
          setPresentation({ ...presentation, id: saved.id });
          fetchPresentations();
        }
      }
    } catch (err) {
      console.error("Error saving presentation:", err);
    }
  };

  const loadPresentation = async (id: string) => {
    try {
      const res = await fetch(`/api/presentations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPresentation({ title: data.title, slides: data.slides });
        setTopic(data.topic || "");
        setCurrentSlide(0);
      }
    } catch (err) {
      console.error("Error loading presentation:", err);
    }
  };

  const deletePresentation = async (id: string) => {
    if (!confirm("Delete this presentation?")) return;
    try {
      const res = await fetch(`/api/presentations/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchPresentations();
        if (presentation?.id === id) {
          setPresentation(null);
        }
      }
    } catch (err) {
      console.error("Error deleting presentation:", err);
    }
  };

  const generateImages = async () => {
    if (!presentation) return;
    setGeneratingImages(true);

    try {
      const updatedSlides = [...presentation.slides];
      for (let i = 0; i < updatedSlides.length; i++) {
        const slide = updatedSlides[i];
        if (slide.layout === "title" || slide.layout === "quote") {
          setCurrentSlide(i);
          const res = await fetch("/api/images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: slide.title }),
          });

          if (res.ok) {
            const data = await res.json();
            updatedSlides[i] = { ...slide, backgroundImage: data.imageUrl };
            setPresentation({ ...presentation, slides: [...updatedSlides] });
            if (presentation.id) {
              await fetch(`/api/presentations/${presentation.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: presentation.title,
                  slides: updatedSlides,
                }),
              });
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }
      }
    } catch (err) {
      console.error("Error generating images:", err);
    } finally {
      setGeneratingImages(false);
    }
  };

  const enhancePresentation = async () => {
    if (!presentation || !enhancePrompt.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          topic: enhancePrompt,
          existingTopic: topic,
          existingSlides: presentation.slides 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to enhance slides");
      }

      setPresentation({ ...data, id: presentation.id });
      setCurrentSlide(0);
      setShowEnhanceModal(false);
      setEnhancePrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (format: "pptx" | "pdf") => {
    if (!presentation) return;
    setDownloading(format);

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presentation, format }),
      });

      if (!res.ok) {
        throw new Error("Download failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${presentation.title.replace(/[^a-z0-9]/gi, "_")}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  const openInGoogleSlides = async () => {
    if (!presentation) return;

    const res = await fetch("/api/google-slides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presentation }),
    });

    if (res.ok) {
      const data = await res.json();
      window.open(data.url, "_blank");
    } else {
      const error = await res.json();
      if (error.needsAuth) {
        alert("Please sign in with Google to use this feature");
      } else {
        alert(error.error || "Failed to create Google Slides");
      }
    }
  };

  const renderSlideContent = (slide: Slide) => {
    switch (slide.layout) {
      case "title":
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <h2 className="text-5xl font-bold text-white mb-6">{slide.title}</h2>
            <p className="text-xl text-purple-200">{slide.content}</p>
          </div>
        );
      case "quote":
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="text-8xl text-purple-500/30 mb-4">&ldquo;</div>
            <p className="text-2xl text-white italic mb-6 max-w-3xl">{slide.content}</p>
            <h3 className="text-xl font-semibold text-purple-300">{slide.title}</h3>
          </div>
        );
      case "two-column":
        const parts = slide.content.split("|");
        return (
          <div className="grid grid-cols-2 gap-12 h-full px-8 py-12">
            <div className="flex flex-col justify-center">
              <h3 className="text-3xl font-bold text-white mb-4">{slide.title}</h3>
              <p className="text-lg text-purple-200">{parts[0] || slide.content}</p>
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-lg text-purple-200">{parts[1] || ""}</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col justify-center h-full px-8 py-12">
            <h3 className="text-3xl font-bold text-white mb-6">{slide.title}</h3>
            <p className="text-xl text-purple-200 leading-relaxed">{slide.content}</p>
          </div>
        );
    }
  };

  const getSlideStyle = (slide: Slide) => {
    if (slide.backgroundImage) {
      return "bg-cover bg-center";
    }
    const bgColors: Record<string, string> = {
      title: "bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600",
      content: "bg-gradient-to-br from-slate-800 to-slate-900",
      "two-column": "bg-gradient-to-br from-indigo-800 to-purple-900",
      quote: "bg-gradient-to-br from-purple-900 via-violet-900 to-slate-900",
    };
    return bgColors[slide.layout] || "bg-gradient-to-br from-slate-800 to-slate-900";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-900 to-slate-900">
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {presentation && (
              <button
                onClick={() => setPresentation(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">GenaSlide</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {session.user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="text-white text-sm">{session.user?.name}</span>
                <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 rounded-xl border border-white/10 shadow-xl z-20 overflow-hidden">
                    <Link
                      href="/settings"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </Link>
                    <div className="border-t border-white/10" />
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        signOut({ callbackUrl: "/login" });
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-white/10 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {!presentation ? (
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl font-bold text-white mb-4">Create Stunning Slides</h1>
                <p className="text-xl text-purple-200">Describe your topic and let AI craft a beautiful presentation</p>
              </div>

              <form onSubmit={handleGenerate} className="space-y-6">
                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-white font-medium mb-2">Presentation Topic</label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = target.scrollHeight + "px";
                    }}
                    className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none overflow-hidden"
                    placeholder="e.g., The Future of Artificial Intelligence in Healthcare"
                    style={{ minHeight: "100px" }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 text-white font-semibold text-lg rounded-2xl hover:from-violet-600 hover:via-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-purple-500/25"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-3">
                      <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Presentation
                    </span>
                  )}
                </button>
              </form>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Saved Presentations</h2>
              {savedPresentations.length === 0 ? (
                <div className="bg-white/5 rounded-2xl p-8 text-center border border-white/10">
                  <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-white/60">No saved presentations yet</p>
                  <p className="text-white/40 text-sm mt-2">Generate a presentation to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedPresentations.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <button
                          onClick={() => loadPresentation(p.id)}
                          className="text-left flex-1"
                        >
                          <h3 className="text-white font-semibold hover:text-purple-300 transition-colors">{p.title}</h3>
                          <p className="text-white/60 text-sm mt-1">{p.topic}</p>
                          <p className="text-white/40 text-xs mt-2">
                            {new Date(p.updatedAt).toLocaleDateString()}
                          </p>
                        </button>
                        <button
                          onClick={() => deletePresentation(p.id)}
                          className="p-2 text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">{presentation.title}</h1>
                {topic && (
                  <p className="text-white/60 text-sm mt-1 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    {topic.length > 80 ? topic.slice(0, 80) + "..." : topic}
                  </p>
                )}
                <p className="text-purple-200 mt-1">
                  Slide {currentSlide + 1} of {presentation.slides.length}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={generateImages}
                  disabled={generatingImages}
                  className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {generatingImages ? "Generating..." : "Generate Images"}
                </button>
                <button
                  onClick={() => setShowEnhanceModal(true)}
                  className="px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded-xl transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Enhance
                </button>
                <button
                  onClick={savePresentation}
                  className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-xl transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {presentation.id ? "Update" : "Save"}
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-xl transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Export
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showExportMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 rounded-xl border border-white/10 shadow-xl z-20 overflow-hidden">
                        <button
                          onClick={() => {
                            openInGoogleSlides();
                            setShowExportMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 transition-all"
                        >
                          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                          </svg>
                          To Google Slides
                        </button>
                        <button
                          onClick={() => {
                            downloadFile("pptx");
                            setShowExportMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 transition-all"
                        >
                          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          To PPTX
                        </button>
                        <button
                          onClick={() => {
                            downloadFile("pdf");
                            setShowExportMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 transition-all"
                        >
                          <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          To PDF
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div
                  className={`aspect-video rounded-3xl overflow-hidden shadow-2xl ${getSlideStyle(presentation.slides[currentSlide])}`}
                  style={presentation.slides[currentSlide].backgroundImage ? {
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${presentation.slides[currentSlide].backgroundImage})`
                  } : undefined}
                >
                  <div className="h-full flex flex-col">
                    {renderSlideContent(presentation.slides[currentSlide])}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 mt-6">
                  <button
                    onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                    disabled={currentSlide === 0}
                    className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-white transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex gap-2">
                    {presentation.slides.map((slide, idx) => (
                      <button
                        key={slide.id}
                        onClick={() => setCurrentSlide(idx)}
                        className={`w-3 h-3 rounded-full transition-all flex items-center ${
                          idx === currentSlide ? "bg-purple-500 w-8" : "bg-white/30 hover:bg-white/50"
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentSlide(Math.min(presentation.slides.length - 1, currentSlide + 1))}
                    disabled={currentSlide === presentation.slides.length - 1}
                    className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-white transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">All Slides</h3>
                <div className="space-y-3">
                  {presentation.slides.map((slide, idx) => (
                    <button
                      key={slide.id}
                      onClick={() => setCurrentSlide(idx)}
                      className={`w-full p-4 rounded-xl text-left transition-all ${
                        idx === currentSlide
                          ? "bg-purple-500/30 border-2 border-purple-500"
                          : "bg-white/5 hover:bg-white/10 border-2 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-purple-400 font-medium w-6">{slide.id}</span>
                        <span className="text-white font-medium truncate">{slide.title}</span>
                        {slide.backgroundImage && (
                          <svg className="w-4 h-4 text-pink-400 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {showEnhanceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-3xl p-6 w-full max-w-2xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Enhance Presentation</h3>
                <p className="text-white/60 text-sm mt-1">Add or modify slides based on your requirements</p>
              </div>
              <button
                onClick={() => {
                  setShowEnhanceModal(false);
                  setEnhancePrompt("");
                }}
                className="text-white/60 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              {topic && (
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <p className="text-white/60 text-xs mb-1">Current Topic:</p>
                  <p className="text-white text-sm">{topic}</p>
                </div>
              )}
              <div>
                <label className="block text-white font-medium mb-2">What would you like to change?</label>
                <textarea
                  value={enhancePrompt}
                  onChange={(e) => setEnhancePrompt(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  placeholder="e.g., Add 2 more slides about pricing, Make the intro slide more catchy, Add a conclusion slide"
                  rows={4}
                />
              </div>
              <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 text-sm text-violet-200">
                <p className="font-medium mb-1">Examples:</p>
                <ul className="list-disc list-inside space-y-1 opacity-80">
                  <li>&quot;Add 2 more slides about pricing&quot;</li>
                  <li>&quot;Make the conclusion more impactful&quot;</li>
                  <li>&quot;Add a quote slide with a relevant quote&quot;</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={enhancePresentation}
                  disabled={loading || !enhancePrompt.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Enhance Slides
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowEnhanceModal(false);
                    setEnhancePrompt("");
                  }}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
