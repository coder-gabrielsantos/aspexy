"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";
import platformLogo from "@/app/util/logo.png";
import platformLogoWhite from "@/app/util/logo-w.png";

type PlatformLogoProps = {
  className?: string;
  /** `white`: variante para fundos escuros (login). */
  variant?: "default" | "white";
  /** Largura/altura em pixels (Next Image). */
  size?: number;
  priority?: boolean;
};

export function PlatformLogo({
  className,
  variant = "default",
  size = 32,
  priority = false
}: PlatformLogoProps) {
  const src = variant === "white" ? platformLogoWhite : platformLogo;

  return (
    <Image
      src={src}
      alt="Aspexy"
      width={size}
      height={size}
      draggable={false}
      className={cn("object-contain", className)}
      priority={priority}
    />
  );
}
