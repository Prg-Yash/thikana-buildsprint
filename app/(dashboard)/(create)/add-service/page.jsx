import { redirect } from "next/navigation";

export default function AddServiceRedirect() {
  redirect("/profile/services");
}
