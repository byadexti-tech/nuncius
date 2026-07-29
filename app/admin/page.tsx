import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";
import { getAuthenticatedUser, getDefaultOrganizationId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login");
  if (!(await getDefaultOrganizationId(user.id))) redirect("/admin/login");

  return <AdminDashboard adminEmail={user.email ?? "Administrador"} />;
}
