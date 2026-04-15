"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";
import platformLogo from "@/app/util/logo.png";

type PlatformLogoProps = {
  className?: string;
  /** Largura/altura em pixels (Next Image). */
  size?: number;
  priority?: boolean;
};

export function PlatformLogo({ className, size = 32, priority = false }: PlatformLogoProps) {
  return (
    <Image
      src={platformLogo}
      alt="Aspexy"
      width={size}
      height={size}
      draggable={false}
      className={cn("object-contain", className)}
      priority={priority}
    />
  );
}
