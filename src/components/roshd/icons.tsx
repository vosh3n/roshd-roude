"use client";

/**
 * آیکون‌های مشترک رشته/سطح/نشان — همه از lucide تا زبان بصری سایت یکدست
 * باشد (بدون ایموجی/استیکر در رابط کاربری).
 */

import {
  Award,
  BadgeCheck,
  Blocks,
  Clapperboard,
  Flame,
  Monitor,
  Palette,
  Rocket,
  Sprout,
  Trophy,
  Tv,
  Zap,
  type LucideIcon,
} from "lucide-react";

const FIELD_ICONS: Record<string, LucideIcon> = {
  computer: Monitor,
  animation: Clapperboard,
  graphic: Palette,
  tv: Tv,
};

const LEVEL_ICONS: Record<string, LucideIcon> = {
  beginner: Sprout,
  foundation: Blocks,
  intermediate: Zap,
  advanced: Flame,
};

const BADGE_ICONS: Record<string, LucideIcon> = {
  start: Sprout,
  streak3: Flame,
  streak7: Rocket,
  c25: BadgeCheck,
  c50: Trophy,
};

export function FieldIcon({ id, size = 18 }: { id: string; size?: number }) {
  const Icon = FIELD_ICONS[id] || Award;
  return <Icon size={size} />;
}

export function LevelIcon({ id, size = 18 }: { id: string; size?: number }) {
  const Icon = LEVEL_ICONS[id] || Award;
  return <Icon size={size} />;
}

export function BadgeIcon({ id, size = 22 }: { id: string; size?: number }) {
  const Icon = BADGE_ICONS[id] || Award;
  return <Icon size={size} />;
}
