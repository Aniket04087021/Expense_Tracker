import { useEffect } from "react";

/**
 * useLandingAnimations
 * Loads GSAP + ScrollTrigger from CDN and wires up cinematic
 * forward-and-reverse scroll animations for every landing section.
 * Call this inside the landing page branch (when !isAuthenticated).
 */
export function useLandingAnimations(isAuthenticated) {
  useEffect(() => {
    if (isAuthenticated) return;

    let ctx = null;

    const init = async () => {
      // ── Load GSAP + ScrollTrigger from CDN ──────────────────────────
      if (!window.gsap) {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js");
      }
      if (!window.ScrollTrigger) {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js");
      }

      const { gsap, ScrollTrigger } = window;
      gsap.registerPlugin(ScrollTrigger);

      // Small helper — creates a ScrollTrigger that plays forward on enter
      // and reverses on scroll back up (toggleActions: "play reverse play reverse")
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

        // ══════════════════════════════════════════════════════════════
        // 1. NAVBAR — slide down + fade in on page load
        // ══════════════════════════════════════════════════════════════
        gsap.from(".landing-nav", {
          y: -80,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          delay: 0.1,
        });

        // ══════════════════════════════════════════════════════════════
        // 2. HERO — staggered cascade on load
        // ══════════════════════════════════════════════════════════════
        const heroTl = gsap.timeline({ delay: 0.3 });
        heroTl
          .from(".hero-badge", {
            opacity: 0, y: 30, duration: 0.6, ease: "back.out(1.7)",
          })
          .from(".hero-title", {
            opacity: 0, y: 50, duration: 0.8, ease: "power3.out",
          }, "-=0.3")
          .from(".lead", {
            opacity: 0, y: 30, duration: 0.7, ease: "power2.out",
          }, "-=0.4")
          .from(".hero-actions", {
            opacity: 0, y: 25, duration: 0.6, ease: "power2.out",
          }, "-=0.3")
          .from(".stat-row .stat-item", {
            opacity: 0, y: 20, stagger: 0.12, duration: 0.5, ease: "power2.out",
          }, "-=0.3")
          .from(".hero-right .dashboard-preview", {
            opacity: 0,
            x: 80,
            rotateY: 12,
            scale: 0.92,
            duration: 1.1,
            ease: "power3.out",
          }, "-=0.9");

        // ── Dashboard card inner elements cascade ──
        gsap.from(".dp-stat-card", {
          opacity: 0, y: 20, stagger: 0.1, duration: 0.5, ease: "power2.out",
          delay: 1.2,
        });
        gsap.from(".dp-tx", {
          opacity: 0, x: 20, stagger: 0.08, duration: 0.4, ease: "power2.out",
          delay: 1.5,
        });

        // ══════════════════════════════════════════════════════════════
        // 3. FEATURES SECTION
        // ══════════════════════════════════════════════════════════════
        gsap.from("#features .section-head .eyebrow", {
          ...st("#features .section-head"),
          opacity: 0, y: 20, duration: 0.5,
        });
        gsap.from("#features .section-head h2", {
          ...st("#features .section-head"),
          opacity: 0, y: 40, duration: 0.7, ease: "power3.out",
        });
        gsap.from("#features .section-head .section-sub", {
          ...st("#features .section-head"),
          opacity: 0, y: 20, duration: 0.5, delay: 0.15,
        });

        // Feature cards — fan out from center with stagger
        gsap.from(".feature-card", {
          scrollTrigger: {
            trigger: ".feature-grid",
            start: "top 85%",
            end: "top 20%",
            toggleActions: "play reverse play reverse",
          },
          opacity: 0,
          y: 60,
          scale: 0.88,
          rotateX: 8,
          stagger: {
            amount: 0.7,
            from: "start",
          },
          duration: 0.7,
          ease: "back.out(1.4)",
        });

        // ══════════════════════════════════════════════════════════════
        // 4. EXPORT SECTION — split reveal
        // ══════════════════════════════════════════════════════════════
        gsap.from(".export-left", {
          ...st("#export"),
          opacity: 0,
          x: -80,
          duration: 0.9,
          ease: "power3.out",
        });
        gsap.from(".export-left .eyebrow", {
          ...st("#export"),
          opacity: 0, y: 15, duration: 0.5,
        });
        gsap.from(".export-left h2", {
          ...st("#export"),
          opacity: 0, y: 30, duration: 0.7, ease: "power3.out", delay: 0.1,
        });
        gsap.from(".export-left .export-desc", {
          ...st("#export"),
          opacity: 0, y: 20, duration: 0.6, delay: 0.2,
        });
        gsap.from(".export-features-list li", {
          scrollTrigger: {
            trigger: ".export-section",
            start: "top 80%",
            end: "top 20%",
            toggleActions: "play reverse play reverse",
          },
          opacity: 0,
          x: -30,
          stagger: 0.1,
          duration: 0.5,
          ease: "power2.out",
        });
        gsap.from(".export-right .pdf-preview", {
          ...st("#export"),
          opacity: 0,
          x: 80,
          rotateY: -10,
          scale: 0.94,
          duration: 1,
          ease: "power3.out",
        });

        // PDF rows animate in after preview enters
        gsap.from(".pdf-table-row", {
          scrollTrigger: {
            trigger: ".export-right",
            start: "top 75%",
            end: "top 20%",
            toggleActions: "play reverse play reverse",
          },
          opacity: 0,
          x: 20,
          stagger: 0.08,
          duration: 0.4,
          ease: "power2.out",
        });
        gsap.from(".pdf-stat-card", {
          scrollTrigger: {
            trigger: ".export-right",
            start: "top 75%",
            end: "top 20%",
            toggleActions: "play reverse play reverse",
          },
          opacity: 0,
          y: 15,
          stagger: 0.08,
          duration: 0.4,
          ease: "power2.out",
        });

        // ══════════════════════════════════════════════════════════════
        // 5. INSIGHTS SECTION — zoom + fade cards
        // ══════════════════════════════════════════════════════════════
        gsap.from("#insights .section-head", {
          ...st("#insights"),
          opacity: 0,
          y: 50,
          duration: 0.8,
          ease: "power3.out",
        });
        gsap.from(".insight-card", {
          scrollTrigger: {
            trigger: ".insights-grid",
            start: "top 85%",
            end: "top 25%",
            toggleActions: "play reverse play reverse",
          },
          opacity: 0,
          y: 50,
          scale: 0.85,
          stagger: 0.15,
          duration: 0.65,
          ease: "back.out(1.6)",
        });

        // ══════════════════════════════════════════════════════════════
        // 6. MONEY STORY SECTION — parallax + slide
        // ══════════════════════════════════════════════════════════════
        gsap.from("#moneystory .section-head", {
          ...st("#moneystory .section-head"),
          opacity: 0,
          y: 60,
          duration: 0.9,
          ease: "power3.out",
        });

        // Story card slides in from left with 3D tilt
        gsap.from(".msl-story-card", {
          scrollTrigger: {
            trigger: ".msl-grid",
            start: "top 82%",
            end: "top 20%",
            toggleActions: "play reverse play reverse",
          },
          opacity: 0,
          x: -100,
          rotateY: 15,
          scale: 0.9,
          duration: 1.1,
          ease: "power3.out",
        });

        // MSL metrics stagger
        gsap.from(".msl-metric", {
          scrollTrigger: {
            trigger: ".msl-story-card",
            start: "top 80%",
            end: "top 20%",
            toggleActions: "play reverse play reverse",
          },
          opacity: 0,
          y: 20,
          stagger: 0.1,
          duration: 0.45,
          ease: "power2.out",
        });

        // Float pills appear with spring
        gsap.from(".msl-share-float", {
          scrollTrigger: {
            trigger: ".msl-card-wrap",
            start: "top 75%",
            end: "top 15%",
            toggleActions: "play reverse play reverse",
          },
          opacity: 0,
          scale: 0,
          stagger: 0.2,
          duration: 0.6,
          ease: "back.out(2)",
        });

        // Right column slides in from right
        gsap.from(".msl-right", {
          scrollTrigger: {
            trigger: ".msl-grid",
            start: "top 82%",
            end: "top 20%",
            toggleActions: "play reverse play reverse",
          },
          opacity: 0,
          x: 100,
          duration: 1,
          ease: "power3.out",
        });

        // msl feature items stagger
        gsap.from(".msl-feat", {
          scrollTrigger: {
            trigger: ".msl-features",
            start: "top 85%",
            end: "top 25%",
            toggleActions: "play reverse play reverse",
          },
          opacity: 0,
          x: 40,
          stagger: 0.12,
          duration: 0.55,
          ease: "power2.out",
        });

        // ══════════════════════════════════════════════════════════════
        // 7. CTA / DOWNLOAD SECTION — scale up reveal
        // ══════════════════════════════════════════════════════════════
        gsap.from(".cta-section .eyebrow", {
          ...st(".cta-inner"),
          opacity: 0, y: 20, duration: 0.5,
        });
        gsap.from(".cta-section h2", {
          ...st(".cta-inner"),
          opacity: 0, y: 50, scale: 0.95, duration: 0.9, ease: "power3.out",
        });
        gsap.from(".cta-section .cta-sub", {
          ...st(".cta-inner"),
          opacity: 0, y: 20, duration: 0.6, delay: 0.1,
        });
        gsap.from(".cta-actions", {
          ...st(".cta-actions"),
          opacity: 0, y: 30, duration: 0.6, ease: "power2.out",
        });

        // Platform cards — cascade with 3D flip
        gsap.from(".platform-card", {
          scrollTrigger: {
            trigger: ".cta-platform-cards",
            start: "top 85%",
            end: "top 20%",
            toggleActions: "play reverse play reverse",
          },
          opacity: 0,
          y: 70,
          rotateX: 20,
          scale: 0.88,
          stagger: 0.15,
          duration: 0.8,
          ease: "back.out(1.5)",
          transformOrigin: "top center",
        });

        // ══════════════════════════════════════════════════════════════
        // 8. FOOTER — fade up in sections
        // ══════════════════════════════════════════════════════════════
        gsap.from(".footer-brand", {
          ...st(".site-footer"),
          opacity: 0, x: -40, duration: 0.7, ease: "power2.out",
        });
        gsap.from(".footer-col", {
          scrollTrigger: {
            trigger: ".footer-links-grid",
            start: "top 90%",
            end: "top 50%",
            toggleActions: "play reverse play reverse",
          },
          opacity: 0,
          y: 30,
          stagger: 0.1,
          duration: 0.6,
          ease: "power2.out",
        });
        gsap.from(".footer-bottom", {
          scrollTrigger: {
            trigger: ".footer-bottom",
            start: "top 98%",
            end: "top 70%",
            toggleActions: "play reverse play reverse",
          },
          opacity: 0,
          y: 15,
          duration: 0.5,
        });

        // ══════════════════════════════════════════════════════════════
        // 9. PARALLAX — subtle background depth on scroll
        // ══════════════════════════════════════════════════════════════
        gsap.to(".msl-bg-glow", {
          scrollTrigger: {
            trigger: "#moneystory",
            start: "top bottom",
            end: "bottom top",
            scrub: 1.5,
          },
          y: -80,
          scale: 1.15,
          ease: "none",
        });

        // ══════════════════════════════════════════════════════════════
        // 10. HORIZONTAL MARQUEE effect on section eyebrows (subtle)
        // ══════════════════════════════════════════════════════════════
        gsap.from(".eyebrow", {
          scrollTrigger: {
            trigger: ".feature-section",
            start: "top 90%",
            toggleActions: "play reverse play reverse",
          },
          opacity: 0,
          letterSpacing: "0.3em",
          duration: 0.8,
          ease: "power2.out",
          stagger: 0.1,
        });

      });
    };

    init();

    return () => {
      if (window.ScrollTrigger) {
        window.ScrollTrigger.getAll().forEach((t) => t.kill());
      }
      if (ctx) ctx.revert();
    };
  }, [isAuthenticated]);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
