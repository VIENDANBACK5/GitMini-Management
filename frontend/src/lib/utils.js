import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Never updated';

  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // seconds

  if (diff < 60) return 'Updated just now';
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `Updated ${m} min${m > 1 ? 's' : ''} ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `Updated ${h} hour${h > 1 ? 's' : ''} ago`;
  }
  if (diff < 2592000) {
    const d = Math.floor(diff / 86400);
    return `Updated ${d} day${d > 1 ? 's' : ''} ago`;
  }
  if (diff < 31536000) {
    const mo = Math.floor(diff / 2592000);
    return `Updated ${mo} month${mo > 1 ? 's' : ''} ago`;
  }
  const y = Math.floor(diff / 31536000);
  return `Updated ${y} year${y > 1 ? 's' : ''} ago`;
}