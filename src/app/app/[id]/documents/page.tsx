import { getFolders, getDocuments } from "./actions";
import DocumentsClient from "./components/DocumentsClient";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [folders, documents] = await Promise.all([
    getFolders(id),
    getDocuments(id),
  ]);

  return (
    <DocumentsClient
      condominiumId={id}
      initialFolders={folders}
      initialDocuments={documents}
    />
  );
}
