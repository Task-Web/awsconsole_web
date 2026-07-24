import AwsConsoleClient from "@/components/AwsConsoleClient";
import { notFound } from "next/navigation";

export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  if (path[0] === "state-manage" || path[0] === "state-doc") notFound();
  return <AwsConsoleClient />;
}
