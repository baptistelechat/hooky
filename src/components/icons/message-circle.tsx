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

export interface MessageCircleIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface MessageCircleIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// `repeatType: "mirror"` sur les deux propriétés -- l'original ne fait
// qu'aller au survol (rotation qui revient à 0, scale qui reste à 1.05) ; en
// boucle continue le mirror ramène aussi le scale à sa valeur de repos entre
// deux secousses au lieu de rester figé grossi.
const ICON_VARIANTS: Variants = {
  normal: {
    scale: 1,
    rotate: 0,
  },
  animate: {
    scale: 1.05,
    rotate: [0, -7, 7, 0],
    transition: {
      rotate: {
        duration: 1.2,
        ease: "easeInOut",
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "mirror",
        repeatDelay: 0.6,
      },
      scale: {
        type: "spring",
        stiffness: 400,
        damping: 10,
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "mirror",
        repeatDelay: 0.6,
      },
    },
  },
};

const MessageCircleIcon = forwardRef<
  MessageCircleIconHandle,
  MessageCircleIconProps
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
      <motion.svg
        animate={controls}
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        variants={ICON_VARIANTS}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      </motion.svg>
    </div>
  );
});

MessageCircleIcon.displayName = "MessageCircleIcon";

export { MessageCircleIcon };
