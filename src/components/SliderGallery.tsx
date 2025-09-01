
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import Image from "next/image";
import { Skeleton } from "./ui/skeleton";
import { Card, CardContent } from "./ui/card";

type Slider = {
  id: string;
  url: string;
};

const DEFAULT_SLIDERS: Slider[] = [
    { id: 'default-1', url: 'https://picsum.photos/350/210?random=1' },
    { id: 'default-2', url: 'https://picsum.photos/350/210?random=2' },
    { id: 'default-3', url: 'https://picsum.photos/350/210?random=3' },
];

export default function SliderGallery() {
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "sliders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
          setSliders(DEFAULT_SLIDERS);
      } else {
          const sliderData = snapshot.docs.map((doc) => ({
            id: doc.id,
            url: doc.data().url,
          }));
          setSliders(sliderData);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching sliders: ", error);
      // On error (e.g. permissions), show default sliders
      setSliders(DEFAULT_SLIDERS);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
        <div>
            <h2 className="text-3xl font-bold tracking-tight mb-6">
                Latest Updates
            </h2>
            <div className="flex space-x-6 overflow-x-auto pb-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-[300px] h-[180px] md:w-[350px] md:h-[210px]">
                        <Skeleton className="rounded-xl h-full w-full" />
                    </div>
                ))}
            </div>
        </div>
    );
  }

  return (
    <div>
        <h2 className="text-3xl font-bold tracking-tight mb-6">
            Latest Updates
        </h2>
        <div className="relative">
             <div className="flex space-x-6 overflow-x-auto pb-4">
                {sliders.map((slider) => (
                    <div key={slider.id} className="flex-shrink-0 w-[300px] h-[180px] md:w-[350px] md:h-[210px]">
                        <Card className="overflow-hidden h-full w-full">
                            <CardContent className="p-0 h-full w-full relative">
                                <Image
                                    src={slider.url}
                                    alt="Slider image"
                                    fill
                                    className="object-cover"
                                />
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}
