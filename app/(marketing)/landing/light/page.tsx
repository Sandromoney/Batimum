import { redirect } from "next/navigation";

/** Ancienne variante light — redirigée vers la landing unique. */
export default function LandingLightPage() {
  redirect("/landing");
}
