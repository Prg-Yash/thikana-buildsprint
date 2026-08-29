import { redirect } from "next/navigation";

export default function ProductsRedirect() {
  redirect("/profile/inventory");
}
