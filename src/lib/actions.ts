'use server';

import { z } from 'zod';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { initializeFirebase } from '@/firebase';

const formSchema = z.object({
  hotelName: z.string(),
  hotelRef: z.string(),
  flightNumber: z.string(),
  pnr: z.string(),
  arrivalAirport: z.string(),
  flightDate: z.date(),
  isHajjUmrah: z.boolean(),
  isTestMode: z.boolean(),
});

type BookingFormValues = z.infer<typeof formSchema>;

// This server action is now much simpler and only handles database writes.
// The complex logic of API calling is handled on the client.
export async function addBooking(data: any, userId: string) {
    const { firestore } = initializeFirebase();
    if (!userId) {
        return { success: false, error: 'User not authenticated.' };
    }

    try {
        await addDoc(collection(firestore, 'bookings'), data);
    } catch (error) {
        console.error("Error adding document: ", error);
        return { success: false, error: 'Failed to save booking to the database.' };
    }

    revalidatePath('/dashboard');
    redirect('/dashboard');
}
