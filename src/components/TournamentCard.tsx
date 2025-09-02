

'use client';

import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import type { Tournament } from "@/lib/mock-data";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Users } from "lucide-react";

type TournamentCardProps = {
  tournament: Tournament;
  isAuthenticated: boolean;
};

export default function TournamentCard({ tournament: initialTournament, isAuthenticated }: TournamentCardProps) {
  const [tournament, setTournament] = useState(initialTournament);
  
  const {
    id,
    name,
    image,
    dataAiHint,
    slots,
  } = tournament;
  
  const linkHref = isAuthenticated ? `/tournaments/${id}` : '/register';

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "tournaments", id), (doc) => {
        if (doc.exists()) {
            setTournament({ id: doc.id, ...doc.data() } as Tournament);
        }
    });
    return () => unsub();
  }, [id]);

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
                 <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-primary font-mono mt-1">ID: {id}</p>
                    <div className="flex items-center gap-1 text-xs font-semibold bg-black/50 text-white py-1 px-2 rounded-full">
                        <Users className="h-3 w-3" />
                        <span>{tournament.slotsFilled || 0} / {slots}</span>
                    </div>
                 </div>
            </CardContent>
        </Card>
    </Link>
  );
}
