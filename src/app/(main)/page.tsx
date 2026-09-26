import { redirect } from "next/navigation";

// The app has no home page of its own; / opens the trade page.
export default function Home() {
  redirect("/trade");
}
