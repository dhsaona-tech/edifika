import { redirect } from "next/navigation";

type PageProps = { params: { id: string } | Promise<{ id: string }> };

export default async function PayableOrdersRedirect({ params }: PageProps) {
  const resolved = await params;
  redirect(`/app/${resolved.id}/payables`);
}
