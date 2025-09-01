
'use client';

import Image from 'next/image';
import Autoplay from 'embla-carousel-autoplay';

import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from './ui/skeleton';

type Slider = {
  id: string;
  url: string;
};

const MOCK_SLIDERS: Slider[] = [
    { id: '1', url: 'https://firebasestorage.googleapis.com/v0/b/fireleagues-drrjw.firebasestorage.app/o/Sliders%2FBermuda_App_Splash.webp?alt=media&token=0bdaa681-9730-4c12-be7c-053d235e9c09' },
    { id: '2', url: 'https://firebasestorage.googleapis.com/v0/b/fireleagues-drrjw.firebasestorage.app/o/Sliders%2Fdownload.jpg?alt=media&token=30f25368-ec19-4671-9e2d-5cb147b6d5bc' }
]


export function HomeSlider() {
  const [sliders, setSliders] = useState<Slider[]>(MOCK_SLIDERS);
  const [loading, setLoading] = useState(false);

  // The Firestore fetching logic is kept in case you want to revert to dynamic sliders later.
  // useEffect(() => {
  //   const q = query(collection(db, 'sliders'), orderBy('createdAt', 'desc'));
  //   const unsubscribe = onSnapshot(q, (snapshot) => {
  //     const sliderData = snapshot.docs.map(doc => ({
  //       id: doc.id,
  //       ...doc.data()
  //     })) as Slider[];
      
  //     // If firestore is empty, use mock data. Otherwise, use firestore data.
  //     setSliders(sliderData.length > 0 ? sliderData : MOCK_SLIDERS);
  //     setLoading(false);
  //   }, (error) => {
  //     console.error("Error fetching sliders: ", error);
  //     // Fallback to mock data on error
  //     setSliders(MOCK_SLIDERS);
  //     setLoading(false);
  //   });

  //   return () => unsubscribe();
  // }, []);


  if (loading) {
    return <Skeleton className="aspect-[16/7] w-full rounded-lg" />
  }

  if (!sliders || sliders.length === 0) {
    // This part should ideally not be reached now with the hardcoded fallback
    return (
        <div className="aspect-[16/7] w-full relative bg-secondary rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">No promotional images available.</p>
        </div>
    );
  }

  return (
    <Carousel
      className="w-full"
      plugins={[Autoplay({ delay: 4000, stopOnInteraction: true })]}
      opts={{ loop: sliders.length > 1 }}
    >
      <CarouselContent>
        {sliders.map((slider, index) => (
          <CarouselItem key={slider.id}>
            <Card className="overflow-hidden rounded-lg">
              <CardContent className="p-0">
                <div className="aspect-[16/7] w-full relative">
                  <Image
                    src={slider.url}
                    alt={`Promotional slider image ${index + 1}`}
                    fill
                    className="object-cover"
                    priority={index === 0}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1000px"
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
