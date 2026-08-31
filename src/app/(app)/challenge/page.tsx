import { ChallengeWorkbench } from "@/components/challenge-workbench";

export const metadata = {
  title: "Nouvelle soumission — kÆYI",
};

export default function ChallengePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <ChallengeWorkbench />
    </main>
  );
}
