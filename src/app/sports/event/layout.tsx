import { EventHost } from "./EventHost";

// Keeps the event page mounted across /sports/event/[id] changes (see EventHost).
export default function EventLayout({ children }: LayoutProps<"/sports/event">) {
  return <EventHost>{children}</EventHost>;
}
