import { toast } from "sonner";
import type { Notice } from "../application/event-page-store";

/** Shows a store action's notice as a toast (success styling or the plain default). */
export function showNotice(notice: Notice | null) {
  if (!notice) return;
  if (notice.tone === "success") toast.success(notice.message);
  else toast(notice.message);
}
