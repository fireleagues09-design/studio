
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
    { id: 'guest1', url: 'https://firebasestorage.googleapis.com/v0/b/fireleagues-drrjw.firebasestorage.app/o/Sliders%2FRegister_Now_Banner.png?alt=media&token=e9c8f85f-8f11-4e7a-9b48-1123a1a5b8e9' },
    { id: 'guest2', url: 'https://firebasestorage.googleapis.com/v0/b/fireleagues-drrjw.firebasestorage.app/o/Sliders%2FWelcome_Bonus_Banner.png?alt=media&token=48c3b9b4-b49c-4e89-8d76-5a417539c3a3' }
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
