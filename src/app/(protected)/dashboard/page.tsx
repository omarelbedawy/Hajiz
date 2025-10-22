'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser } from '@/firebase';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useUser();

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-headline font-bold">
        Welcome, {user?.email || 'Pilgrim'}!
      </h1>
      <p className="text-muted-foreground mt-2">
        Here are your tracked bookings. Add a new one to get started.
      </p>

      <div className="mt-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Bookings</CardTitle>
              <CardDescription>
                All your Hajj and Umrah related travel bookings.
              </CardDescription>
            </div>
             <Button asChild>
              <Link href="/bookings/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Booking
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center text-center p-16 border-t">
            <p className="text-lg text-muted-foreground">
              You have no bookings yet.
            </p>
            <p className="text-sm text-muted-foreground mt-1">Click &quot;Add New Booking&quot; to track your first trip.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
