import { getLayoutData } from "@/lib/layout/getLayoutData";
import TopHeaderClient from "./TopHeaderClient";

export default async function TopHeader({ condominiumId }: { condominiumId: string }) {
  const data = await getLayoutData(condominiumId);

  return <TopHeaderClient data={data} />;
}
