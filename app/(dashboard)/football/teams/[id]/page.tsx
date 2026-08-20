import TeamDetailClient from "@/components/TeamDetailClient";

export default function TeamDetailPage({ params }: { params: { id: string } }) {
  return <TeamDetailClient teamId={params.id} />;
}
