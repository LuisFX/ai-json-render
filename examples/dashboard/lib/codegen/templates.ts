/**
 * Standalone component templates that don't depend on json-render
 * These components receive data as props instead of using hooks
 */

export const componentTemplates: Record<string, string> = {
  Card: `"use client";

import { ReactNode } from "react";

interface CardProps {
  title?: string | null;
  description?: string | null;
  padding?: "sm" | "md" | "lg" | null;
  children?: ReactNode;
}

export function Card({ title, description, padding, children }: CardProps) {
  const paddings: Record<string, string> = {
    sm: "12px",
    md: "16px",
    lg: "24px",
  };

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
      }}
    >
      {(title || description) && (
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {title && (
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              {title}
            </h3>
          )}
          {description && (
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--muted)" }}>
              {description}
            </p>
          )}
        </div>
      )}
      <div style={{ padding: paddings[padding || "md"] || "16px" }}>
        {children}
      </div>
    </div>
  );
}
`,

  Grid: `"use client";

import { ReactNode } from "react";

interface GridProps {
  columns?: number | null;
  gap?: "sm" | "md" | "lg" | null;
  children?: ReactNode;
}

export function Grid({ columns, gap, children }: GridProps) {
  const gaps: Record<string, string> = {
    sm: "8px",
    md: "16px",
    lg: "24px",
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: \`repeat(\${columns || 2}, 1fr)\`,
        gap: gaps[gap || "md"],
      }}
    >
      {children}
    </div>
  );
}
`,

  Stack: `"use client";

import { ReactNode } from "react";

interface StackProps {
  direction?: "horizontal" | "vertical" | null;
  gap?: "sm" | "md" | "lg" | null;
  align?: "start" | "center" | "end" | "stretch" | null;
  children?: ReactNode;
}

export function Stack({ direction, gap, align, children }: StackProps) {
  const gaps: Record<string, string> = {
    sm: "8px",
    md: "16px",
    lg: "24px",
  };
  const alignments: Record<string, string> = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    stretch: "stretch",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction === "horizontal" ? "row" : "column",
        gap: gaps[gap || "md"],
        alignItems: alignments[align || "stretch"],
      }}
    >
      {children}
    </div>
  );
}
`,

  Metric: `"use client";

interface MetricProps {
  label: string;
  valuePath: string;
  format?: "number" | "currency" | "percent" | null;
  trend?: "up" | "down" | "neutral" | null;
  trendValue?: string | null;
  data?: Record<string, unknown>;
}

function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const segments = path.startsWith("/") ? path.slice(1).split("/") : path.split("/");
  let current: unknown = obj;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

export function Metric({ label, valuePath, format, trend, trendValue, data }: MetricProps) {
  const rawValue = data ? getByPath(data, valuePath) : undefined;

  let displayValue = String(rawValue ?? "-");
  if (format === "currency" && typeof rawValue === "number") {
    displayValue = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(rawValue);
  } else if (format === "percent" && typeof rawValue === "number") {
    displayValue = new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 1,
    }).format(rawValue);
  } else if (format === "number" && typeof rawValue === "number") {
    displayValue = new Intl.NumberFormat("en-US").format(rawValue);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 14, color: "var(--muted)" }}>{label}</span>
      <span style={{ fontSize: 32, fontWeight: 600 }}>{displayValue}</span>
      {(trend || trendValue) && (
        <span
          style={{
            fontSize: 14,
            color:
              trend === "up"
                ? "#22c55e"
                : trend === "down"
                  ? "#ef4444"
                  : "var(--muted)",
          }}
        >
          {trend === "up" ? "+" : trend === "down" ? "-" : ""}
          {trendValue}
        </span>
      )}
    </div>
  );
}
`,

  Chart: `"use client";

interface ChartProps {
  type?: "bar" | "line" | "pie" | "area";
  dataPath: string;
  title?: string | null;
  height?: number | null;
  data?: Record<string, unknown>;
}

function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const segments = path.startsWith("/") ? path.slice(1).split("/") : path.split("/");
  let current: unknown = obj;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

export function Chart({ title, dataPath, height, data }: ChartProps) {
  const chartData = data
    ? (getByPath(data, dataPath) as Array<{ label: string; value: number }> | undefined)
    : undefined;

  if (!chartData || !Array.isArray(chartData)) {
    return <div style={{ padding: 20, color: "var(--muted)" }}>No data</div>;
  }

  const maxValue = Math.max(...chartData.map((d) => d.value));

  return (
    <div>
      {title && (
        <h4 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600 }}>
          {title}
        </h4>
      )}
      <div
        style={{ display: "flex", gap: 8, alignItems: "flex-end", height: height || 120 }}
      >
        {chartData.map((d, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div
              style={{
                width: "100%",
                height: \`\${(d.value / maxValue) * 100}%\`,
                background: "var(--foreground)",
                borderRadius: "4px 4px 0 0",
                minHeight: 4,
              }}
            />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
`,

  Table: `"use client";

interface TableProps {
  dataPath: string;
  columns: Array<{ key: string; label: string; format?: "text" | "currency" | "date" | "badge" | null }>;
  data?: Record<string, unknown>;
}

function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const segments = path.startsWith("/") ? path.slice(1).split("/") : path.split("/");
  let current: unknown = obj;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

export function Table({ dataPath, columns, data }: TableProps) {
  const tableData = data
    ? (getByPath(data, dataPath) as Array<Record<string, unknown>> | undefined)
    : undefined;

  if (!tableData || !Array.isArray(tableData)) {
    return <div style={{ padding: 20, color: "var(--muted)" }}>No data</div>;
  }

  const formatCell = (value: unknown, format?: string | null) => {
    if (value === null || value === undefined) return "-";
    if (format === "currency" && typeof value === "number") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
    }
    if (format === "date" && typeof value === "string") {
      return new Date(value).toLocaleDateString();
    }
    if (format === "badge") {
      return (
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 500,
            background: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          {String(value)}
        </span>
      );
    }
    return String(value);
  };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              style={{
                textAlign: "left",
                padding: "12px 8px",
                borderBottom: "1px solid var(--border)",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tableData.map((row, i) => (
          <tr key={i}>
            {columns.map((col) => (
              <td
                key={col.key}
                style={{
                  padding: "12px 8px",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 14,
                }}
              >
                {formatCell(row[col.key], col.format)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
`,

  Button: `"use client";

interface ButtonProps {
  label: string;
  variant?: "primary" | "secondary" | "danger" | "ghost" | null;
  size?: "sm" | "md" | "lg" | null;
  action?: string;
  disabled?: boolean | null;
  onClick?: () => void;
}

export function Button({ label, variant, disabled, onClick }: ButtonProps) {
  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: "var(--foreground)",
      color: "var(--background)",
      border: "none",
    },
    secondary: {
      background: "transparent",
      color: "var(--foreground)",
      border: "1px solid var(--border)",
    },
    danger: { background: "#dc2626", color: "#fff", border: "none" },
    ghost: { background: "transparent", color: "var(--muted)", border: "none" },
  };

  return (
    <button
      onClick={onClick}
      disabled={!!disabled}
      style={{
        padding: "8px 16px",
        borderRadius: "var(--radius)",
        fontSize: 14,
        fontWeight: 500,
        opacity: disabled ? 0.5 : 1,
        ...variants[variant || "primary"],
      }}
    >
      {label}
    </button>
  );
}
`,

  Heading: `"use client";

interface HeadingProps {
  text: string;
  level?: "h1" | "h2" | "h3" | "h4" | null;
}

export function Heading({ text, level }: HeadingProps) {
  const sizes: Record<string, { fontSize: number; fontWeight: number }> = {
    h1: { fontSize: 32, fontWeight: 700 },
    h2: { fontSize: 24, fontWeight: 600 },
    h3: { fontSize: 20, fontWeight: 600 },
    h4: { fontSize: 16, fontWeight: 600 },
  };

  const style = sizes[level || "h2"];
  const Tag = (level || "h2") as keyof JSX.IntrinsicElements;

  return (
    <Tag style={{ margin: 0, ...style }}>
      {text}
    </Tag>
  );
}
`,

  Text: `"use client";

interface TextProps {
  content: string;
  variant?: "body" | "caption" | "label" | null;
  color?: "default" | "muted" | "success" | "warning" | "danger" | null;
}

export function Text({ content, variant, color }: TextProps) {
  const sizes: Record<string, number> = {
    body: 14,
    caption: 12,
    label: 13,
  };

  const colors: Record<string, string> = {
    default: "var(--foreground)",
    muted: "var(--muted)",
    success: "#22c55e",
    warning: "#eab308",
    danger: "#ef4444",
  };

  return (
    <p
      style={{
        margin: 0,
        fontSize: sizes[variant || "body"],
        color: colors[color || "default"],
      }}
    >
      {content}
    </p>
  );
}
`,

  Badge: `"use client";

interface BadgeProps {
  text: string;
  variant?: "default" | "success" | "warning" | "danger" | "info" | null;
}

export function Badge({ text, variant }: BadgeProps) {
  const colors: Record<string, { bg: string; fg: string }> = {
    default: { bg: "var(--border)", fg: "var(--foreground)" },
    success: { bg: "#22c55e20", fg: "#22c55e" },
    warning: { bg: "#eab30820", fg: "#eab308" },
    danger: { bg: "#ef444420", fg: "#ef4444" },
    info: { bg: "#3b82f620", fg: "#3b82f6" },
  };

  const { bg, fg } = colors[variant || "default"];

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500,
        background: bg,
        color: fg,
      }}
    >
      {text}
    </span>
  );
}
`,

  Alert: `"use client";

interface AlertProps {
  type: "info" | "success" | "warning" | "error";
  title: string;
  message?: string | null;
  dismissible?: boolean | null;
}

export function Alert({ type, title, message }: AlertProps) {
  const colors: Record<string, string> = {
    info: "var(--muted)",
    success: "#22c55e",
    warning: "#eab308",
    error: "#ef4444",
  };

  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: "var(--radius)",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderLeftWidth: 4,
        borderLeftColor: colors[type],
      }}
    >
      <div style={{ fontWeight: 500, fontSize: 14 }}>{title}</div>
      {message && (
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          {message}
        </div>
      )}
    </div>
  );
}
`,

  Divider: `"use client";

interface DividerProps {
  label?: string | null;
}

export function Divider({ label }: DividerProps) {
  if (label) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
    );
  }

  return <hr style={{ border: "none", height: 1, background: "var(--border)", margin: "16px 0" }} />;
}
`,

  Empty: `"use client";

interface EmptyProps {
  title: string;
  description?: string | null;
  action?: string | null;
  actionLabel?: string | null;
}

export function Empty({ title, description }: EmptyProps) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <div style={{ fontSize: 16, fontWeight: 500 }}>{title}</div>
      {description && (
        <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 8 }}>
          {description}
        </div>
      )}
    </div>
  );
}
`,

  Select: `"use client";

interface SelectProps {
  label?: string | null;
  bindPath: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string | null;
  value?: string;
  onChange?: (value: string) => void;
}

export function Select({ label, options, placeholder, value, onChange }: SelectProps) {
  return (
    <div>
      {label && (
        <label style={{ display: "block", fontSize: 13, marginBottom: 4, color: "var(--muted)" }}>
          {label}
        </label>
      )}
      <select
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          color: "var(--foreground)",
          fontSize: 14,
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
`,

  DatePicker: `"use client";

interface DatePickerProps {
  label?: string | null;
  bindPath: string;
  placeholder?: string | null;
  value?: string;
  onChange?: (value: string) => void;
}

export function DatePicker({ label, placeholder, value, onChange }: DatePickerProps) {
  return (
    <div>
      {label && (
        <label style={{ display: "block", fontSize: 13, marginBottom: 4, color: "var(--muted)" }}>
          {label}
        </label>
      )}
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder || ""}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          color: "var(--foreground)",
          fontSize: 14,
        }}
      />
    </div>
  );
}
`,

  List: `"use client";

import { ReactNode } from "react";

interface ListProps {
  dataPath: string;
  emptyMessage?: string | null;
  data?: Record<string, unknown>;
  children?: ReactNode;
}

function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const segments = path.startsWith("/") ? path.slice(1).split("/") : path.split("/");
  let current: unknown = obj;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

export function List({ dataPath, emptyMessage, data, children }: ListProps) {
  const listData = data
    ? (getByPath(data, dataPath) as unknown[] | undefined)
    : undefined;

  if (!listData || !Array.isArray(listData) || listData.length === 0) {
    return (
      <div style={{ padding: 20, color: "var(--muted)", textAlign: "center" }}>
        {emptyMessage || "No items"}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {children}
    </div>
  );
}
`,
};
