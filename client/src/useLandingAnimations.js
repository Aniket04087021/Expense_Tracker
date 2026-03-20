import { useEffect } from "react";

/**
 * useLandingAnimations
 * Loads GSAP + ScrollTrigger from CDN and wires up cinematic
 * forward-and-reverse scroll animations for every landing section.
 * All 3D transforms are disabled on mobile to prevent clipping.
 */
export function useLandingAnimations(isAuthenticated) {
  useEffect(() => {
    if (isAuthenticated) return;

    let ctx = null;
    const isMobile = window.innerWidth <= 768;

    const init = async () => {
      if (!window.gsap) {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js");
      }
      if (!window.ScrollTrigger) {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js");
      }

      const { gsap, ScrollTrigger } = window;
      gsap.registerPlugin(ScrollTrigger);

      const st = (trigger, vars = {}) => ({
        scrollTrigger: {
          trigger,
          start: "top 88%",
          end: "top 30%",
          toggleActions: "play reverse play reverse",
          ...vars,
        },
      });

      ctx = gsap.context(() => {

        // ── 1. NAVBAR ──────────────────────────────────────────
        gsap.from(".landing-nav", {
          y: -80, opacity: 0, duration: 0.9, ease: "power3.out", delay: 0.1,
        });

        // ── 2. HERO ────────────────────────────────────────────
        const heroTl = gsap.timeline({ delay: 0.3 });
        heroTl
          .from(".hero-badge", { opacity: 0, y: 30, duration: 0.6, ease: "back.out(1.7)" })
          .from(".hero-title", { opacity: 0, y: 50, duration: 0.8, ease: "power3.out" }, "-=0.3")
          .from(".lead",       { opacity: 0, y: 30, duration: 0.7, ease: "power2.out" }, "-=0.4")
          .from(".hero-actions", { opacity: 0, y: 25, duration: 0.6, ease: "power2.out" }, "-=0.3")
          .from(".stat-row .stat-item", { opacity: 0, y: 20, stagger: 0.12, duration: 0.5, ease: "power2.out" }, "-=0.3")
          .from(".hero-right .dashboard-preview", {
            opacity: 0,
            x:       isMobile ? 0  : 80,
            rotateY: isMobile ? 0  : 12,
            scale: 0.92,
            duration: 1.1,
            ease: "power3.out",
          }, "-=0.9");

        gsap.from(".dp-stat-card", { opacity: 0, y: 20, stagger: 0.1, duration: 0.5, ease: "power2.out", delay: 1.2 });
        gsap.from(".dp-tx",        { opacity: 0, x: isMobile ? 0 : 20, stagger: 0.08, duration: 0.4, ease: "power2.out", delay: 1.5 });

        // ── 3. FEATURES ────────────────────────────────────────
        gsap.from("#features .section-head", {
          ...st("#features .section-head"),
          opacity: 0, y: 40, duration: 0.7, ease: "power3.out",
        });
        gsap.from(".feature-card", {
          scrollTrigger: {
            trigger: ".feature-grid",
            start: "top 85%",
            end: "top 20%",
            toggleActions: "play reverse play reverse",
          },
          opacity: 0,
          y: 60,
          scale: 0.9,
          rotateX: isMobile ? 0 : 8,
          stagger: { amount: 0.6, from: "start" },
          duration: 0.65,
          ease: "back.out(1.3)",
        });

        // ── 4. EXPORT ──────────────────────────────────────────
        gsap.from(".export-left", {
          ...st("#export"),
          opacity: 0, x: isMobile ? 0 : -80, duration: 0.9, ease: "power3.out",
        });
        gsap.from(".export-features-list li", {
          scrollTrigger: { trigger: ".export-section", start: "top 80%", end: "top 20%", toggleActions: "play reverse play reverse" },
          opacity: 0, x: isMobile ? 0 : -30, stagger: 0.1, duration: 0.5, ease: "power2.out",
        });
        gsap.from(".export-right .pdf-preview", {
          ...st("#export"),
          opacity: 0, x: isMobile ? 0 : 80, rotateY: isMobile ? 0 : -10, scale: 0.94, duration: 1, ease: "power3.out",
        });
        gsap.from(".pdf-table-row", {
          scrollTrigger: { trigger: ".export-right", start: "top 75%", end: "top 20%", toggleActions: "play reverse play reverse" },
          opacity: 0, x: isMobile ? 0 : 20, stagger: 0.08, duration: 0.4, ease: "power2.out",
        });
        gsap.from(".pdf-stat-card", {
          scrollTrigger: { trigger: ".export-right", start: "top 75%", end: "top 20%", toggleActions: "play reverse play reverse" },
          opacity: 0, y: 15, stagger: 0.08, duration: 0.4, ease: "power2.out",
        });

        // ── 5. INSIGHTS ────────────────────────────────────────
        gsap.from("#insights .section-head", {
          ...st("#insights"), opacity: 0, y: 50, duration: 0.8, ease: "power3.out",
        });
        gsap.from(".insight-card", {
          scrollTrigger: { trigger: ".insights-grid", start: "top 85%", end: "top 25%", toggleActions: "play reverse play reverse" },
          opacity: 0, y: 50, scale: 0.88, stagger: 0.15, duration: 0.65, ease: "back.out(1.5)",
        });

        // ── 6. MONEY STORY ─────────────────────────────────────
        gsap.from("#moneystory .section-head", {
          ...st("#moneystory .section-head"), opacity: 0, y: 60, duration: 0.9, ease: "power3.out",
        });
        gsap.from(".msl-story-card", {
          scrollTrigger: { trigger: ".msl-grid", start: "top 82%", end: "top 20%", toggleActions: "play reverse play reverse" },
          opacity: 0, x: isMobile ? 0 : -100, rotateY: isMobile ? 0 : 15, scale: 0.92, duration: 1.1, ease: "power3.out",
        });
        gsap.from(".msl-metric", {
          scrollTrigger: { trigger: ".msl-story-card", start: "top 80%", end: "top 20%", toggleActions: "play reverse play reverse" },
          opacity: 0, y: 20, stagger: 0.1, duration: 0.45, ease: "power2.out",
        });
        if (!isMobile) {
          gsap.from(".msl-share-float", {
            scrollTrigger: { trigger: ".msl-card-wrap", start: "top 75%", end: "top 15%", toggleActions: "play reverse play reverse" },
            opacity: 0, scale: 0, stagger: 0.2, duration: 0.6, ease: "back.out(2)",
          });
        }
        gsap.from(".msl-right", {
          scrollTrigger: { trigger: ".msl-grid", start: "top 82%", end: "top 20%", toggleActions: "play reverse play reverse" },
          opacity: 0, x: isMobile ? 0 : 100, duration: 1, ease: "power3.out",
        });
        gsap.from(".msl-feat", {
          scrollTrigger: { trigger: ".msl-features", start: "top 85%", end: "top 25%", toggleActions: "play reverse play reverse" },
          opacity: 0, x: isMobile ? 0 : 40, stagger: 0.12, duration: 0.55, ease: "power2.out",
        });

        // ── 7. CTA ─────────────────────────────────────────────
        gsap.from(".cta-section h2", {
          ...st(".cta-inner"), opacity: 0, y: 50, scale: 0.95, duration: 0.9, ease: "power3.out",
        });
        gsap.from(".cta-section .cta-sub", {
          ...st(".cta-inner"), opacity: 0, y: 20, duration: 0.6, delay: 0.1,
        });
        gsap.from(".cta-actions", {
          ...st(".cta-actions"), opacity: 0, y: 30, duration: 0.6, ease: "power2.out",
        });
        gsap.from(".platform-card", {
          scrollTrigger: { trigger: ".cta-platform-cards", start: "top 85%", end: "top 20%", toggleActions: "play reverse play reverse" },
          opacity: 0, y: 70, rotateX: isMobile ? 0 : 20, scale: 0.9,
          stagger: 0.15, duration: 0.8, ease: "back.out(1.4)", transformOrigin: "top center",
        });

        // ── 8. FOOTER ──────────────────────────────────────────
        gsap.from(".footer-brand", {
          ...st(".site-footer"), opacity: 0, x: isMobile ? 0 : -40, duration: 0.7, ease: "power2.out",
        });
        gsap.from(".footer-col", {
          scrollTrigger: { trigger: ".footer-links-grid", start: "top 90%", end: "top 50%", toggleActions: "play reverse play reverse" },
          opacity: 0, y: 30, stagger: 0.1, duration: 0.6, ease: "power2.out",
        });

        // ── 9. SCROLL PROGRESS BAR ─────────────────────────────
        gsap.to("#gsap-progress", {
          scrollTrigger: { trigger: "body", start: "top top", end: "bottom bottom", scrub: 0 },
          scaleX: 1, transformOrigin: "left center", ease: "none",
        });

        // ── 10. PARALLAX (desktop only) ────────────────────────
        if (!isMobile) {
          gsap.to(".msl-bg-glow", {
            scrollTrigger: { trigger: "#moneystory", start: "top bottom", end: "bottom top", scrub: 1.5 },
            y: -80, scale: 1.15, ease: "none",
          });
        }

      });
    };

    init();

    return () => {
      if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach((t) => t.kill());
      if (ctx) ctx.revert();
    };
  }, [isAuthenticated]);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
