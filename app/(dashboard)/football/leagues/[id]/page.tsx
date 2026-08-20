import LeagueDetailClient from "@/components/LeagueDetailClient";

export default function LeagueDetailPage({ params }: { params: { id: string } }) {
  return <LeagueDetailClient leagueId={params.id} />;
}
