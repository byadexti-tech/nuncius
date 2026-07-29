import { redirect } from "next/navigation";
import { AdminSettingsPage } from "@/components/admin-settings-page";
import { getAuthenticatedUser } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login");
  return <AdminSettingsPage />;
}
