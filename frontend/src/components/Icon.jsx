import React from "react";

export const ICON_SIZES = {
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
  hero: 36
};

export const ICON_COLORS = {
  current: "currentColor",
  primary: "var(--primary)",
  secondary: "var(--secondary)",
  cyan: "var(--secondary)",
  success: "var(--primary)",
  danger: "var(--danger)",
  warning: "var(--warning)",
  muted: "var(--text-muted)",
  dim: "var(--text-dim)",
  ink: "var(--primary-ink)",
  white: "#F4F7F5"
};

export default function Icon({
  icon: IconComponent,
  size = 18,
  strokeWidth = 2,
  color = "current",
  className = "",
  style = {},
  spin = false,
  "aria-label": ariaLabel,
  ...rest
}) {
  if (!IconComponent) return null;

  const resolvedSize = typeof size === "string" && ICON_SIZES[size] ? ICON_SIZES[size] : size;
  const resolvedColor = ICON_COLORS[color] || color || "currentColor";
  const isAccessible = Boolean(ariaLabel);

  return (
    <span
      className={`inline-icon ${spin ? "animate-spin" : ""} ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        verticalAlign: "middle",
        lineHeight: 1,
        color: resolvedColor,
        ...style
      }}
      aria-hidden={isAccessible ? "false" : "true"}
      role={isAccessible ? "img" : undefined}
      aria-label={ariaLabel}
      {...rest}
    >
      <IconComponent
        size={resolvedSize}
        strokeWidth={strokeWidth}
        color="currentColor"
        aria-hidden="true"
      />
    </span>
  );
}
