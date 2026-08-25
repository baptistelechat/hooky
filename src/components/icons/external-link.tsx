"use client";

import type { Variants } from "motion/react";
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

export interface ExternalLinkIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ExternalLinkIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// Durée portée de 0.5 à 1.2 + `repeatDelay` -- boucle continue en badge
// décoratif, pas un petit saut ponctuel au survol : besoin d'une pause entre
// deux sauts pour rester lisible plutôt qu'un tremblement permanent.
const ARROW_VARIANTS: Variants = {
  normal: {
    scale: 1,
    translateX: 0,
    translateY: 0,
  },
  animate: {
    scale: [1, 0.92, 1],
    translateX: [0, 2, 0],
    translateY: [0, -2, 0],
    originX: 1,
    originY: 0,
    transition: {
      duration: 1.2,
      ease: "easeInOut",
      repeat: Number.POSITIVE_INFINITY,
      repeatType: "loop",
      repeatDelay: 0.5,
    },
  },
};

const ExternalLinkIcon = forwardRef<
  ExternalLinkIconHandle,
  ExternalLinkIconProps
>(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
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
      if (!isControlledRef.current) controls.start("animate");
      onMouseEnter?.(e);
    },
    [controls, onMouseEnter],
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isControlledRef.current) controls.start("normal");
      onMouseLeave?.(e);
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
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <motion.g animate={controls} variants={ARROW_VARIANTS}>
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
        </motion.g>
      </svg>
    </div>
  );
});

ExternalLinkIcon.displayName = "ExternalLinkIcon";

export { ExternalLinkIcon };
