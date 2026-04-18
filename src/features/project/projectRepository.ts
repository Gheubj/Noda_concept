import type { NodlyProject, NodlyProjectMeta } from "@/shared/types/project";
import { apiClient } from "@/shared/api/client";
import {
  decodeSnapshotFromCloud,
  deleteProject,
  encodeSnapshotForCloud,
  listProjectsByUser,
  loadProject,
  saveProject
} from "@/features/project/projectStorage";
import { useSessionStore } from "@/store/useSessionStore";

function canUseCloud() {
  return Boolean(useSessionStore.getState().user?.id);
}

export async function listProjects(userId: string): Promise<NodlyProjectMeta[]> {
  if (!canUseCloud()) {
    return listProjectsByUser(userId);
  }
  const cloud = await apiClient.get<Array<{ id: string; title: string; createdAt: string; updatedAt: string }>>(
    "/api/projects"
  );
  const sessionUserId = useSessionStore.getState().user?.id ?? userId;
  return cloud.map((item) => ({
    id: item.id,
    userId: sessionUserId,
    title: item.title,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  }));
}

export async function saveProjectSmart(project: NodlyProject) {
  if (!canUseCloud()) {
    return saveProject(project);
  }
  const snapshot = await encodeSnapshotForCloud(project.snapshot);
  await apiClient.put(`/api/projects/${project.meta.id}`, {
    title: project.meta.title,
    snapshot
  });
}

export async function loadProjectSmart(projectId: string): Promise<NodlyProject | null> {
  if (!canUseCloud()) {
    return loadProject(projectId);
  }
  const raw = await apiClient.get<NodlyProject>(`/api/projects/${projectId}`);
  const snapshot = await decodeSnapshotFromCloud(raw.snapshot as unknown);
  return { meta: raw.meta, snapshot };
}

export async function deleteProjectSmart(projectId: string): Promise<void> {
  if (!canUseCloud()) {
    await deleteProject(projectId);
    return;
  }
  await apiClient.delete(`/api/projects/${projectId}`);
}

