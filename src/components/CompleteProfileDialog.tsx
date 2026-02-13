
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { completeRegistration } from '@/app/profile/actions';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

const profileSchema = z.object({
  username: z.string()
    .min(6, 'Username must be at least 6 characters long.')
    .max(12, 'Username cannot be more than 12 characters long.')
    .regex(/^[a-zA-Z0-9]+$/, 'Username can only contain letters and numbers.'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type CompleteProfileDialogProps = {
  open: boolean;
  onSuccess: () => void;
};

export function CompleteProfileDialog({ open, onSuccess }: CompleteProfileDialogProps) {
  const { toast } = useToast();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(data: ProfileFormValues) {
    const user = auth.currentUser;
    if (!user) {
      toast({ title: 'Error', description: 'You are not logged in.', variant: 'destructive' });
      return;
    }
    
    try {
      const idToken = await user.getIdToken();
      const result = await completeRegistration(idToken, data.username);
      
      if (result.success) {
        toast({ title: 'Success!', description: 'Your profile is now complete.' });
        onSuccess();
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message || 'An unknown error occurred.',
        variant: 'destructive'
      });
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent 
        onInteractOutside={(e) => e.preventDefault()}
        hideCloseButton={true}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">Complete Your Profile</DialogTitle>
          <DialogDescription>
            Just one last step! Please choose a unique username to finish creating your account.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="6-12 characters" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
