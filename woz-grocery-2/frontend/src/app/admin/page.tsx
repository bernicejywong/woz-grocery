import { redirect } from "next/navigation";
import { makeSessionId } from "@/lib/session";

export default function AdminRoot() {
  const id = makeSessionId();
  redirect(`/session/${id}/admin`);
}
