/**
 * Clerk appearance: premium dark theme aligned with ReStock Pro extension.
 * Uses Clerk's dark base theme so components render dark; variables tune colors and typography.
 */
import { dark } from "@clerk/ui/themes";

export const clerkAppearance = {
  theme: dark,
  options: {
    logoImageUrl: "https://getrestock.app/logospb.png",
    logoPlacement: "inside",
    socialButtonsPlacement: "top",
    socialButtonsVariant: "blockButton",
  },
  elements: {
    headerTitle: "auth-clerk-header-hidden",
    headerSubtitle: "auth-clerk-header-hidden",
  },
  variables: {
    colorPrimary: "#7c3aed",
    colorBackground: "#151518",
    colorInput: "#1a1a1f",
    colorInputForeground: "#fafafa",
    colorForeground: "#fafafa",
    colorMutedForeground: "#8e8e98",
    colorMuted: "#1a1a1f",
    colorBorder: "rgba(255, 255, 255, 0.08)",
    colorRing: "rgba(124, 58, 237, 0.5)",
    colorDanger: "#ef4444",
    colorSuccess: "#22c55e",
    colorWarning: "#f59e0b",
    colorNeutral: "#71717a",
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    fontFamilyButtons: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    borderRadius: "12px",
    spacing: "1rem",
  },
};
