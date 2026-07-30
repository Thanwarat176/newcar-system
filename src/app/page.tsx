import { redirect } from "next/navigation";
import { PATHS } from "./lib/paths";

export default function Home() {
  redirect(PATHS.auth.auth)
}