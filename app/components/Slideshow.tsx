"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, EffectFade, Keyboard } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css/effect-fade";

interface Slide {
  id: number;
  title: string;
  content: string;
  layout: "title" | "content" | "two-column" | "quote" | "stat" | "cards" | "split";
  backgroundImage?: string;
}

interface SlideshowProps {
  slides: Slide[];
  fullscreenMode: boolean;
  slideAnimations: Record<number, boolean>;
  onSlideChange: (index: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSwiperInit: (swiper: any) => void;
}

const getLayoutClasses = (layout: string, hasImage: boolean) => {
  if (hasImage) return "";
  const classes: Record<string, string> = {
    title: "bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700",
    content: "bg-gradient-to-br from-slate-800 to-slate-900",
    "two-column": "bg-gradient-to-br from-indigo-800 to-purple-900",
    quote: "bg-gradient-to-br from-purple-900 via-violet-900 to-slate-900",
    stat: "bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900",
    cards: "bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950",
    split: "bg-gradient-to-r from-violet-900 via-slate-900 to-indigo-900",
  };
  return classes[layout] || classes.content;
};

const Slideshow = ({
  slides,
  fullscreenMode,
  slideAnimations,
  onSlideChange,
  onSwiperInit,
}: SlideshowProps) => {
  const renderSlideContent = (slide: Slide, isAnimated: boolean) => {
    const animationClass = isAnimated ? "animate-slide-up" : "";

    switch (slide.layout) {
      case "title":
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-16">
            <h2 className={`text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-4 ${animationClass}`}>
              {slide.title}
            </h2>
            <p className={`text-xl md:text-2xl text-purple-200 max-w-4xl ${animationClass}`}>
              {slide.content}
            </p>
          </div>
        );

      case "quote":
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-16">
            <div className="text-8xl text-purple-500/30 mb-2">&ldquo;</div>
            <p className="text-2xl md:text-3xl text-white italic mb-6 max-w-4xl">
              {slide.content}
            </p>
            <div className="flex items-center gap-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-purple-400" />
              <span className="text-lg font-semibold text-purple-300">{slide.title}</span>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-purple-400" />
            </div>
          </div>
        );

      case "two-column":
        const parts = slide.content.split("|");
        return (
          <div className="flex flex-col justify-center h-full px-16 py-12">
            <h3 className={`text-4xl font-bold text-white mb-8 ${animationClass}`}>{slide.title}</h3>
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-4">
                <p className="text-lg text-purple-200 whitespace-pre-line">{parts[0]?.trim()}</p>
              </div>
              <div className="space-y-4 border-l border-white/20 pl-12">
                <p className="text-lg text-purple-200 whitespace-pre-line">{parts[1]?.trim()}</p>
              </div>
            </div>
          </div>
        );

      case "stat":
        const statLines = slide.content.split("\n").filter((l) => l.trim());
        return (
          <div className="flex flex-col items-center justify-center h-full px-16 py-12">
            <h3 className={`text-4xl font-bold text-white mb-10 ${animationClass}`}>{slide.title}</h3>
            <div className="grid grid-cols-4 gap-6 w-full max-w-5xl">
              {statLines.slice(0, 4).map((line, idx) => {
                const cleanLine = line.replace(/^[-•*]\s*/, "").trim();
                const [stat, label] = cleanLine.includes(":")
                  ? [cleanLine.split(":")[0], cleanLine.split(":").slice(1).join(":")]
                  : ["", cleanLine];
                return (
                  <div key={idx} className={`text-center p-6 bg-white/10 rounded-xl backdrop-blur ${animationClass}`}>
                    <div className="text-4xl font-bold text-purple-400 mb-2">{stat}</div>
                    <div className="text-sm text-purple-200">{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "cards":
        const cardLines = slide.content.split("\n").filter((l) => l.trim());
        return (
          <div className="flex flex-col justify-center h-full px-16 py-12">
            <h3 className={`text-4xl font-bold text-white mb-8 text-center ${animationClass}`}>{slide.title}</h3>
            <div className="grid grid-cols-3 gap-6">
              {cardLines.slice(0, 3).map((line, idx) => {
                const cleanLine = line.replace(/^[-•*]\s*/, "").trim();
                const colors = ["from-purple-500/20 to-pink-500/20", "from-pink-500/20 to-violet-500/20", "from-violet-500/20 to-purple-500/20"];
                return (
                  <div key={idx} className={`p-6 bg-gradient-to-br ${colors[idx]} rounded-xl border border-white/10 ${animationClass}`}>
                    <div className="text-lg font-semibold text-white mb-2">{cleanLine.split(":")[0]}</div>
                    <div className="text-sm text-purple-200">{cleanLine.split(":")[1]?.trim()}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "split":
        const splitLines = slide.content.split("\n").filter((l) => l.trim());
        return (
          <div className="grid grid-cols-2 h-full">
            <div className="flex flex-col justify-center px-16 py-12 bg-gradient-to-r from-violet-600/30 to-transparent">
              <h3 className={`text-5xl font-bold text-white ${animationClass}`}>{slide.title}</h3>
            </div>
            <div className="flex flex-col justify-center px-12 py-12 bg-black/20">
              <div className="space-y-4">
                {splitLines.slice(0, 4).map((line, idx) => {
                  const cleanLine = line.replace(/^[-•*]\s*/, "").trim();
                  return (
                    <div key={idx} className="flex items-center gap-4">
                      <span className="w-2 h-2 bg-pink-400 rounded-full" />
                      <span className="text-lg text-white">{cleanLine}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      default:
        const lines = slide.content.split("\n").filter((l) => l.trim());
        return (
          <div className="flex flex-col justify-center h-full px-16 py-12">
            <h3 className={`text-4xl font-bold text-white mb-6 ${animationClass}`}>{slide.title}</h3>
            <div className="space-y-3">
              {lines.map((line, idx) => {
                const cleanLine = line.replace(/^[-•*]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
                return cleanLine ? (
                  <div key={idx} className="flex items-start gap-4">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mt-2" />
                    <span className="text-xl text-purple-200">{cleanLine}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className="relative w-full h-full"
      style={{ minHeight: fullscreenMode ? "100vh" : "500px", height: fullscreenMode ? "100vh" : "auto" }}
    >
      <Swiper
        modules={[Pagination, Navigation, EffectFade, Keyboard]}
        spaceBetween={0}
        slidesPerView={1}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        pagination={{
          clickable: true,
          dynamicBullets: false,
        }}
        navigation={!fullscreenMode}
        keyboard={{ enabled: true, onlyInViewport: true }}
        onSlideChange={(swiper) => onSlideChange(swiper.activeIndex)}
        onSwiper={(swiper) => onSwiperInit(swiper)}
        className="w-full h-full"
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.id} className="!h-auto">
            <div
              className={`relative flex items-center justify-center ${getLayoutClasses(slide.layout, !!slide.backgroundImage)}`}
              style={{
                backgroundImage: slide.backgroundImage
                  ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${slide.backgroundImage})`
                  : undefined,
                backgroundSize: slide.backgroundImage ? "cover" : undefined,
                backgroundPosition: slide.backgroundImage ? "center" : undefined,
                minHeight: fullscreenMode ? "100vh" : "500px",
                height: fullscreenMode ? "100vh" : "auto",
              }}
            >
              <div className="w-full max-w-7xl mx-auto">
                {renderSlideContent(slide, slideAnimations[slide.id] || false)}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default Slideshow;
