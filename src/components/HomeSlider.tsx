
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import Autoplay from 'embla-carousel-autoplay';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';

type Slider = {
  id: string;
  url: string;
};

// Default sliders to show if the database is empty or on error
const DEFAULT_SLIDERS: Slider[] = [
  { id: 'default-1', url: 'https://picsum.photos/1200/500?random=1' },
  { id: 'default-2', url: 'https://picsum.photos/1200/500?random=2' },
  { id: 'default-3', url: 'https://picsum.photos/1200/500?random=3' },
];

export function HomeSlider() {
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'sliders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        if (snapshot.empty) {
          setSliders(DEFAULT_SLIDERS);
        } else {
          const sliderData = snapshot.docs.map(doc => ({
            id: doc.id,
            url: doc.data().url,
          }));
          setSliders(sliderData);
        }
        setLoading(false);
      },
      error => {
        console.error('Error fetching sliders: ', error);
        setSliders(DEFAULT_SLIDERS); // Fallback to default on error
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="w-full">
        <Skeleton className="aspect-[12/5] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <Carousel
      className="w-full"
      plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
      opts={{ loop: true }}
    >
      <CarouselContent>
        {sliders.map((slider, index) => (
          <CarouselItem key={slider.id}>
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-[12/5] w-full relative">
                  <Image
                    src={slider.url}
                    alt={`Promotional slider image ${index + 1}`}
                    fill
                    className="object-cover"
                    priority={index === 0} // Prioritize loading the first image
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
