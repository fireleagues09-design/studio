import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Tournament } from "@/lib/mock-data";
import { ArrowRight, Swords, Map, Users, Trophy } from "lucide-react";
import { Progress } from "./ui/progress";

type TournamentCardProps = {
  tournament: Tournament;
};

export default function TournamentCard({ tournament }: TournamentCardProps) {
  const {
    id,
    name,
    category,
    prize,
    entryFee,
    slots,
    slotsFilled,
    image,
    dataAiHint,
  } = tournament;
  const slotsRemaining = slots - slotsFilled;
  const isFilled = slotsRemaining <= 0;
  const progress = (slotsFilled / slots) * 100;

  const categoryIcon =
    category === "Clash Squad 4v4" ? (
      <Swords className="h-4 w-4" />
    ) : (
      <Map className="h-4 w-4" />
    );

  return (
    <Card className="flex flex-col overflow-hidden transition-transform transform hover:-translate-y-1 hover:shadow-primary/20 hover:shadow-lg">
      <CardHeader className="p-0 relative">
        <Image
          src={image}
          alt={name}
          data-ai-hint={dataAiHint}
          width={600}
          height={400}
          className="aspect-[4/3] object-cover w-full"
        />
        <Badge
          className="absolute top-3 right-3"
          variant={isFilled ? "destructive" : "default"}
        >
          {isFilled ? "Filled" : "Registering"}
        </Badge>
      </CardHeader>
      <CardContent className="flex-grow p-4">
        <Badge variant="secondary" className="mb-2">
          {categoryIcon}
          <span className="ml-2">{category}</span>
        </Badge>
        <CardTitle className="text-xl h-14 line-clamp-2">{name}</CardTitle>
        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span>Prize Pool: <strong>₹{prize}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span>Entry Fee: <strong>{entryFee}</strong></span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start p-4 pt-0">
        <div className="w-full">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Slots Filled</span>
                <span>{slotsFilled} / {slots}</span>
            </div>
            <Progress value={progress} className="h-2"/>
        </div>
        <Button asChild className="w-full mt-4" disabled={isFilled}>
          <Link href={`/tournaments/${id}`}>
            {isFilled ? 'View Details' : 'Register Now'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
