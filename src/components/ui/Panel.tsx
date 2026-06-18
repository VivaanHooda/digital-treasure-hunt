import { cn } from "@/lib/cn";

/* A HUD panel: sharp corners, hairline frame, corner brackets, mono label.
   Deliberately not a soft card — reads as instrumentation. */
export function Panel({
  label,
  aside,
  className,
  bodyClassName,
  children,
}: {
  label?: string;
  aside?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("relative border border-line bg-paper-1/40", className)}>
      {/* corner brackets */}
      <span aria-hidden className="absolute -left-px -top-px h-2.5 w-2.5 border-l border-t border-signal/50" />
      <span aria-hidden className="absolute -right-px -top-px h-2.5 w-2.5 border-r border-t border-signal/50" />
      <span aria-hidden className="absolute -bottom-px -left-px h-2.5 w-2.5 border-b border-l border-signal/50" />
      <span aria-hidden className="absolute -bottom-px -right-px h-2.5 w-2.5 border-b border-r border-signal/50" />
      {(label || aside) && (
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          {label && <span className="label">{label}</span>}
          {aside}
        </div>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </div>
  );
}
