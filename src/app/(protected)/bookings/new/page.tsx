'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { CalendarIcon, Hotel, Loader2, Plane, TestTube } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useUser } from '@/firebase';
import { Switch } from '@/components/ui/switch';
import { addBooking } from '@/lib/actions';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
    flightNumber: z.string().min(1, { message: 'Flight number is required.' }),
    flightDate: z.date({ required_error: 'Flight date is required.' }),
    isTestMode: z.boolean().default(false),
    hotelName: z.string(),
    hotelRef: z.string(),
    pnr: z.string(),
    arrivalAirport: z.string(),
    isHajjUmrah: z.boolean(),
  }).superRefine((data, ctx) => {
    if (data.isTestMode) {
      // In test mode, only flight number and date are required
      return;
    }
    // In non-test mode, more fields are required
    if (data.hotelName.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Hotel name is required.',
        path: ['hotelName'],
      });
    }
    if (data.hotelRef.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Booking reference is required.',
        path: ['hotelRef'],
      });
    }
    if (data.pnr.length !== 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'PNR must be exactly 6 characters.',
        path: ['pnr'],
      });
    }
    if (data.arrivalAirport.length !== 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Airport code must be 3 characters.',
        path: ['arrivalAirport'],
      });
    }
  });

type BookingFormValues = z.infer<typeof formSchema>;


export default function NewBookingPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hotelName: '',
      hotelRef: '',
      flightNumber: '',
      pnr: '',
      arrivalAirport: '',
      isHajjUmrah: false,
      isTestMode: false,
    },
  });

  async function onSubmit(values: BookingFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to create a booking.' });
      return;
    }
    setIsLoading(true);
    
    try {
      const result = await addBooking(values, user.uid);
      if (result?.error) {
        throw new Error(result.error);
      }
      // Redirect is handled by the server action
      toast({ title: 'Success!', description: 'Your booking has been added and tracked.' });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'Could not save the booking.',
      });
    } finally {
        setIsLoading(false);
    }
  }

  const isTestMode = form.watch('isTestMode');

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Add New Booking</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField control={form.control} name="isTestMode" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center">
                      <TestTube className="mr-2 h-5 w-5 text-primary"/>
                      Test Mode
                    </FormLabel>
                    <FormDescription>
                      In Test Mode, only flight number and date are required.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )} />

              
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center"><Plane className="mr-2 h-5 w-5 text-primary" /> Flight Information</h3>
                <div className="space-y-4">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="flightNumber" render={({ field }) => (
                      <FormItem><FormLabel>Flight Number</FormLabel><FormControl><Input placeholder="e.g., SV590" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="flightDate" render={({ field }) => (
                      <FormItem className="flex flex-col"><FormLabel>Flight Date</FormLabel><Popover>
                          <PopoverTrigger asChild><FormControl>
                              <Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button></FormControl></PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date('1900-01-01')} initialFocus />
                          </PopoverContent>
                        </Popover><FormMessage /></FormItem>
                    )} />
                  </div>
                  {!isTestMode && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField control={form.control} name="pnr" render={({ field }) => (
                         <FormItem><FormLabel>PNR / Airline Locator</FormLabel><FormControl><Input placeholder="6-character code" {...field} maxLength={6} /></FormControl><FormMessage /></FormItem>
                       )} />
                       <FormField control={form.control} name="arrivalAirport" render={({ field }) => (
                         <FormItem><FormLabel>Arrival Airport</FormLabel><FormControl><Input placeholder="e.g., JED" {...field} maxLength={3} /></FormControl><FormMessage /></FormItem>
                       )} />
                    </div>
                  )}
                </div>
              </div>
              
              {!isTestMode && (
                <>
                <Separator />
                 <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center"><Hotel className="mr-2 h-5 w-5 text-primary" /> Hotel Information</h3>
                  <div className="space-y-4">
                    <FormField control={form.control} name="hotelName" render={({ field }) => (
                      <FormItem><FormLabel>Hotel Name</FormLabel><FormControl><Input placeholder="e.g., Makkah Clock Royal Tower" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="hotelRef" render={({ field }) => (
                      <FormItem><FormLabel>Hotel Booking Reference</FormLabel><FormControl><Input placeholder="Confirmation Number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>
                </>
              )}
              <Separator />
              <FormField control={form.control} name="isHajjUmrah" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>This is for a Hajj or Umrah trip</FormLabel>
                      <FormDescription>Select this if the booking is related to your pilgrimage.</FormDescription>
                    </div>
                  </FormItem>
                )} />
             
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Booking
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
