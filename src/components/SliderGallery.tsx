
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase"; // adjust import to your firebase config
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import Image from "next/image";
import { Skeleton } from "./ui/skeleton";
import { Card, CardContent } from "./ui/card";

type Slider = {
  id: string;
  url: string;
};

export default function SliderGallery() {
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "sliders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const sliderData = snapshot.docs.map((doc) => ({
        id: doc.id,
        url: doc.data().url,
      }));
      setSliders(sliderData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching sliders: ", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <div className="flex space-x-4 overflow-x-auto p-2">
                <Skeleton className="rounded-xl w-72 h-40" />
                <Skeleton className="rounded-xl w-72 h-40" />
                <Skeleton className="rounded-xl w-72 h-40" />
            </div>
      </div>
    );
  }

  if (sliders.length === 0) {
    return null; // Don't render anything if there are no sliders
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
