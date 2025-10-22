'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useFirestore, useUser } from '@/firebase';
import { PlusCircle, Loader2, Hotel, Plane, Calendar, Info } from 'lucide-react';
import Link from 'next/link';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const bookingsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    // Query the top-level 'bookings' collection
    return query(collection(firestore, 'bookings'), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: bookings, isLoading, error } = useCollection(bookingsQuery);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'ReadyToTrack':
        return 'default';
      case 'Pending Verification':
        return 'secondary';
      case 'Confirmed':
      case 'Landed':
        return 'success'; // A success variant would be good here.
      case 'Cancelled':
      case 'CRITICAL_DELAY':
        return 'destructive';
      default:
        return 'outline';
    }
  }

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
          <CardContent className="border-t pt-6">
            {isLoading && (
               <div className="flex flex-col items-center justify-center text-center p-16">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 <p className="mt-4 text-muted-foreground">Loading your bookings...</p>
               </div>
            )}
            {!isLoading && !bookings?.length && (
              <div className="flex flex-col items-center justify-center text-center p-16">
                <p className="text-lg text-muted-foreground">
                  You have no bookings yet.
                </p>
                <p className="text-sm text-muted-foreground mt-1">Click &quot;Add New Booking&quot; to track your first trip.</p>
              </div>
            )}
             {!isLoading && bookings && bookings.length > 0 && (
              <div className="grid gap-6">
                {bookings.map((booking) => (
                  <Card key={booking.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 items-center">
                    <div className="col-span-1 md:col-span-2 space-y-3">
                       <div className="flex items-center gap-3">
                         <Plane className="h-5 w-5 text-primary" />
                         <span className="font-semibold text-lg">{booking.flightNumber}</span>
                         {booking.isTestMode && <Badge variant="outline">Test Mode</Badge>}
                       </div>
                       <div className="flex items-center gap-3 text-sm text-muted-foreground">
                         <Hotel className="h-4 w-4" />
                         <span>{booking.hotelName}</span>
                       </div>
                       <div className="flex items-center gap-3 text-sm text-muted-foreground">
                         <Calendar className="h-4 w-4" />
                         <span>{booking.flightDate ? format((booking.flightDate as Timestamp).toDate(), 'PPP') : 'No date'}</span>
                       </div>
                    </div>
                     <div className="col-span-1 flex flex-col items-start md:items-end justify-center space-y-2">
                       <div className="flex items-center gap-2">
                         <Info className="h-4 w-4 text-muted-foreground"/>
                         <span className="text-sm text-muted-foreground">Status</span>
                       </div>
                       <Badge variant={getStatusVariant(booking.status)} className="text-sm">
                         {booking.status}
                       </Badge>
                     </div>
                  </Card>
                ))}
              </div>
            )}
             {error && (
              <div className="flex flex-col items-center justify-center text-center p-16 text-destructive">
                <p>Could not load bookings.</p>
                <p className="text-sm">{error.message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
