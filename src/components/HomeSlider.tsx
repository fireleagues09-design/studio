
'use client';

import Image from 'next/image';
import Autoplay from 'embla-carousel-autoplay';

import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';

type Slider = {
  id: string;
  url: string;
};

const sliders: Slider[] = [
    {
        id: 'user-slide-1',
        url: 'https://firebasestorage.googleapis.com/v0/b/fireleagues-drrjw.firebasestorage.app/o/Sliders%2Fdownload.jpg?alt=media&token=30f25368-ec19-4671-9e2d-5cb147b6d5bc'
    },
    {
        id: 'user-slide-2',
        url: 'https://firebasestorage.googleapis.com/v0/b/fireleagues-drrjw.firebasestorage.app/o/Sliders%2Fdownload.jpg?alt=media&token=30f25368-ec19-4671-9e2d-5cb147b6d5bc'
    }
];


export function HomeSlider() {

  if (!sliders || sliders.length === 0) {
    return null;
  }

  return (
    <Carousel
      className="w-full"
      plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
      opts={{ loop: sliders.length > 1 }}
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
