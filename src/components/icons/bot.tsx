"use client";

import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import { cn } from "@/lib/utils";

export interface BotIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface BotIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const BotIcon = forwardRef<BotIconHandle, BotIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    // Auto-loop dès le montage -- badge décoratif non survolable (overlay
    // `pointer-events-none`), le hover d'origine ne se déclenchera jamais.
    useEffect(() => {
      controls.start("animate");
    }, [controls]);

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter],
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave],
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 8V4H8" />
          <rect height="12" rx="2" width="16" x="4" y="8" />
          <path d="M2 14h2" />
          <path d="M20 14h2" />

          {/* Durée portée de 0.5 à 1.1 -- boucle continue en badge décoratif,
              pas un clin d'oeil ponctuel au survol. */}
          <motion.line
            animate={controls}
            initial="normal"
            variants={{
              normal: { y1: 13, y2: 15 },
              animate: {
                y1: [13, 14, 13],
                y2: [15, 14, 15],
                transition: {
                  duration: 1.1,
                  ease: "easeInOut",
                  delay: 0.2,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "loop",
                },
              },
            }}
            x1={15}
            x2={15}
          />

          <motion.line
            animate={controls}
            initial="normal"
            variants={{
              normal: { y1: 13, y2: 15 },
              animate: {
                y1: [13, 14, 13],
                y2: [15, 14, 15],
                transition: {
                  duration: 1.1,
                  ease: "easeInOut",
                  delay: 0.2,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "loop",
                },
              },
            }}
            x1={9}
            x2={9}
          />
        </svg>
      </div>
    );
  },
);

BotIcon.displayName = "Bot";

export { BotIcon };
