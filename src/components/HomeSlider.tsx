
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

type HomeSliderProps = {
    isAuthenticated: boolean;
};

const AUTHENTICATED_SLIDERS: Slider[] = [
    { id: 'auth1', url: 'https://firebasestorage.googleapis.com/v0/b/fireleagues-drrjw.firebasestorage.app/o/Sliders%2FBermuda_App_Splash.webp?alt=media&token=0bdaa681-9730-4c12-be7c-053d235e9c09' },
    { id: 'auth2', url: 'https://firebasestorage.googleapis.com/v0/b/fireleagues-drrjw.firebasestorage.app/o/Sliders%2Fdownload.jpg?alt=media&token=30f25368-ec19-4671-9e2d-5cb147b6d5bc' }
];

const GUEST_SLIDERS: Slider[] = [
    { id: 'guest1', url: 'https://firebasestorage.googleapis.com/v0/b/fireleagues-drrjw.firebasestorage.app/o/Sliders%2FA%20R%20A%20G%20AT%20O.jpeg?alt=media&token=176f0a74-a381-4f91-ae32-1172c0190ece' },
    { id: 'guest2', url: 'https://firebasestorage.googleapis.com/v0/b/fireleagues-drrjw.firebasestorage.app/o/Sliders%2FBlack%20and%20White%20PC%20Wallpaper%204K.jpeg?alt=media&token=aa55fbd2-5647-435b-8574-8d5aabc866de' }
];


export function HomeSlider({ isAuthenticated }: HomeSliderProps) {
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Use different sliders based on authentication status
    setSliders(isAuthenticated ? AUTHENTICATED_SLIDERS : GUEST_SLIDERS);
    setLoading(false);
  }, [isAuthenticated]);


  if (loading) {
    return <Skeleton className="aspect-[16/7] w-full rounded-lg" />
  }

  if (!sliders || sliders.length === 0) {
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
