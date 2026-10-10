import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

// shadcn Spinner — bundled into @meridian/chat (copied per the shadcn model; the app keeps its own copy).
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
