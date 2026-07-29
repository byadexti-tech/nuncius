import { notFound, redirect } from "next/navigation";
import { SnippetManager } from "@/components/snippet-manager";
import { AdminShell } from "@/components/admin-shell";
import { getAuthenticatedUser, requireProjectAccess } from "@/lib/auth";
import { getProject } from "@/lib/projects";
import { listSnippets } from "@/lib/snippets";
import { isValidProjectId } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    snippet?: string | string[];
    tab?: string | string[];
  }>;
};

export default async function ProjectSnippetsPage({
  params,
  searchParams,
}: Props) {
  const { projectId } = await params;
  if (!isValidProjectId(projectId)) notFound();

  const [user, project, query] = await Promise.all([
    getAuthenticatedUser(),
    getProject(projectId),
    searchParams,
  ]);
  if (!user) redirect("/admin/login");
  if (!project) notFound();

  const access = await requireProjectAccess(
    projectId,
    ["owner", "admin", "editor", "viewer"],
    user,
    project.organization_id,
  );
  if (!access.ok) redirect("/admin");

  const snippets = await listSnippets(projectId);
  const requestedSnippet = Array.isArray(query.snippet)
    ? query.snippet[0]
    : query.snippet;
  const requestedTab = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const initialSnippetId = snippets.some(
    (snippet) => snippet.id === requestedSnippet,
  )
    ? requestedSnippet
    : snippets[0]?.id;

  return (
    <AdminShell
      email={user.email ?? "Administrador"}
      projectName={project.name}
    >
      <SnippetManager
        project={project}
        role={access.membership.role}
        initialSnippets={snippets}
        initialSnippetId={initialSnippetId}
        initialTab={requestedTab}
      />
    </AdminShell>
  );
}
