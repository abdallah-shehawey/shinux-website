import type { IconType } from "react-icons";
import {
  FaGithub,
  FaLinkedin,
  FaFacebook,
  FaInstagram,
  FaWhatsapp,
  FaTelegram,
  FaGlobe,
  FaLink,
  FaEnvelope,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

// Keyed by SocialLinksForm's `platform` values. Also matched by substring
// against free-text labels like site.ts's "X (Twitter)" or "Portfolio".
const ICONS: Record<string, IconType> = {
  github: FaGithub,
  twitter: FaXTwitter,
  linkedin: FaLinkedin,
  facebook: FaFacebook,
  instagram: FaInstagram,
  whatsapp: FaWhatsapp,
  telegram: FaTelegram,
  website: FaGlobe,
  portfolio: FaGlobe,
  email: FaEnvelope,
  other: FaLink,
};

export function getSocialIcon(platformOrLabel: string): IconType {
  const key = platformOrLabel.toLowerCase().trim();
  if (ICONS[key]) return ICONS[key];
  const match = Object.entries(ICONS).find(([k]) => key.includes(k));
  return match ? match[1] : FaLink;
}
