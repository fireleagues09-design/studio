

import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import type { Tournament } from "@/lib/mock-data";

type TournamentCardProps = {
  tournament: Tournament;
  isAuthenticated: boolean;
};

export default function TournamentCard({ tournament, isAuthenticated }: TournamentCardProps) {
  const {
    id,
    name,
    image,
    dataAiHint,
  } = tournament;
  
  const linkHref = isAuthenticated ? `/tournaments/${id}` : '/register';

  return (
    <Link href={linkHref} className="group">
        <Card className="flex flex-col overflow-hidden transition-transform transform hover:-translate-y-1 hover:shadow-primary/20 hover:shadow-lg w-full aspect-square relative">
            <Image
            src={image}
            alt={name}
            data-ai-hint={dataAiHint}
            fill
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <CardContent className="relative flex flex-col justify-end flex-grow p-3 text-white">
                 <h3 className="text-base font-bold leading-tight line-clamp-2">{name}</h3>
            </CardContent>
        </Card>
    </Link>
  );
}
