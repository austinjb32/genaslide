"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState("");
  const [loadingPresentations, setLoadingPresentations] = useState(true);

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

  const exportToSheets = () => {
    if (!presentation) return;
    const header = "Slide #\tTitle\tContent\tLayout";
    const rows = presentation.slides.map(
      (slide) => `${slide.id}\t${slide.title}\t${slide.content.replace(/\n/g, " ")}\t${slide.layout}`
    );
    const tsv = [header, ...rows].join("\n");
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${presentation.title.replace(/[^a-z0-9]/gi, "_")}_edit.tsv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const importFromSheets = () => {
    if (!editData.trim()) return;
    const lines = editData.trim().split("\n");
    if (lines.length < 2) return;

    const headers = lines[0].split("\t").map((h) => h.toLowerCase().trim());
    const titleIdx = headers.indexOf("title");
    const contentIdx = headers.indexOf("content");
    const layoutIdx = headers.indexOf("layout");

    if (titleIdx === -1 || contentIdx === -1) return;

    const updatedSlides: Slide[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split("\t");
      updatedSlides.push({
        id: i,
        title: cols[titleIdx] || `Slide ${i}`,
        content: cols[contentIdx] || "",
        layout: (layoutIdx !== -1 && cols[layoutIdx] ? cols[layoutIdx] : "content") as Slide["layout"],
        backgroundImage: presentation?.slides[i - 1]?.backgroundImage,
      });
    }

    if (updatedSlides.length > 0) {
      setPresentation({ ...presentation!, slides: updatedSlides });
      setCurrentSlide(0);
    }
    setShowEditModal(false);
    setEditData("");
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
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">GenaSlide</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                {session.user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="text-white">{session.user?.name}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-all"
            >
              Sign Out
            </button>
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
                    className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                    placeholder="e.g., The Future of Artificial Intelligence in Healthcare"
                    rows={4}
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
                <p className="text-purple-200 mt-1">
                  Slide {currentSlide + 1} of {presentation.slides.length}
                </p>
              </div>
              <div className="flex gap-3">
                {!presentation.id && (
                  <button
                    onClick={savePresentation}
                    className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-xl transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save
                  </button>
                )}
                <button
                  onClick={generateImages}
                  disabled={generatingImages}
                  className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {generatingImages ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Generate Images
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    exportToSheets();
                    setShowEditModal(true);
                  }}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-xl transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => downloadFile("pptx")}
                  disabled={downloading !== null}
                  className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {downloading === "pptx" ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  PPTX
                </button>
                <button
                  onClick={() => downloadFile("pdf")}
                  disabled={downloading !== null}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {downloading === "pdf" ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  PDF
                </button>
                <button
                  onClick={() => setPresentation(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                >
                  Back
                </button>
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

      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-3xl p-6 w-full max-w-4xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Edit in Google Sheets</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditData("");
                }}
                className="text-white/60 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 text-sm text-green-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">Instructions:</p>
                  <button
                    onClick={exportToSheets}
                    className="px-3 py-1 bg-green-500/30 hover:bg-green-500/50 text-green-200 rounded-lg text-xs font-medium flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export TSV
                  </button>
                </div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Click &quot;Export TSV&quot; to download the file</li>
                  <li>Open in Google Sheets (File &gt; Open &gt; Upload)</li>
                  <li>Edit the content in Google Sheets</li>
                  <li>Copy the entire sheet data (Ctrl+A, Ctrl+C)</li>
                  <li>Paste it below and click &quot;Import&quot;</li>
                </ol>
              </div>
              <div>
                <label className="block text-white font-medium mb-2">Paste TSV Data from Google Sheets</label>
                <textarea
                  value={editData}
                  onChange={(e) => setEditData(e.target.value)}
                  className="w-full h-64 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  placeholder="Paste your TSV data here..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={importFromSheets}
                  className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-semibold rounded-xl transition-all"
                >
                  Import
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditData("");
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
