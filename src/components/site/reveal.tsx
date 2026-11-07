import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article" | "figure" | "li";
  /** Delay in ms, to stagger items of a grid. */
  delay?: number;
}

/** Fades and lifts its content in when it scrolls into view (disabled with prefers-reduced-motion). */
export function Reveal({ as: Tag = "div", delay = 0, className, style, children, ...props }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return setVisible(true);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn("reveal", visible && "is-visible", className)}
      style={{ ...style, transitionDelay: delay ? `${delay}ms` : undefined }}
      {...props}
    >
      {children}
    </Tag>
  );
}
