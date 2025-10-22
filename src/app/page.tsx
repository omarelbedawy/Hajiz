'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Plane, Hotel, CheckCircle } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useEffect, useState } from 'react';

export default function Home() {
  const heroImage = PlaceHolderImages.find((p) => p.id === 'landing-hero');
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <div className="flex flex-col">
      <section className="relative w-full h-[60vh] md:h-[70vh]">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            priority
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="absolute inset-0 bg-primary/70" />
        <div className="relative h-full flex flex-col items-center justify-center text-center text-primary-foreground p-4">
          <h1 className="text-4xl md:text-6xl font-headline font-bold drop-shadow-md">
            Hajiz
          </h1>
          <p className="mt-4 max-w-2xl text-lg md:text-xl drop-shadow">
            Seamlessly track your Hajj and Umrah hotel and flight bookings.
          </p>
          <Button asChild className="mt-8" size="lg">
            <Link href="/signup">
              Get Started <ArrowRight className="ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-center text-foreground">
            Your Pilgrimage, Simplified
          </h2>
          <p className="mt-4 max-w-3xl mx-auto text-center text-muted-foreground text-lg">
            Focus on your spiritual journey. We&apos;ll handle the logistics.
          </p>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center p-6 rounded-lg transition-all hover:bg-card">
              <div className="bg-primary/10 p-4 rounded-full">
                <Hotel className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-headline font-semibold">Hotel Tracking</h3>
              <p className="mt-2 text-muted-foreground">Keep your hotel booking references in one place.</p>
            </div>
            <div className="flex flex-col items-center p-6 rounded-lg transition-all hover:bg-card">
              <div className="bg-primary/10 p-4 rounded-full">
                <Plane className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-headline font-semibold">Flight Details</h3>
              <p className="mt-2 text-muted-foreground">Store flight numbers, PNRs, and dates securely.</p>
            </div>
            <div className="flex flex-col items-center p-6 rounded-lg transition-all hover:bg-card">
              <div className="bg-primary/10 p-4 rounded-full">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-headline font-semibold">Status Updates</h3>
              <p className="mt-2 text-muted-foreground">Know the verification status of your bookings.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="container mx-auto py-6 px-4 text-center text-muted-foreground">
          <p>&copy; {year} Hajiz. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
