'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { completeRegistration } from '@/app/profile/actions';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { Eye, EyeOff } from 'lucide-react';
import { EmailAuthProvider, linkWithCredential, updateProfile, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/context/LoadingContext';

const profileSchema = z.object({
  realName: z.string().min(2, 'Real name must be at least 2 characters.'),
  username: z.string()
    .min(6, 'Username must be at least 6 characters long.')
    .max(12, 'Username cannot be more than 12 characters long.')
    .regex(/^[a-z0-9]+$/, 'Username can only contain lowercase letters and numbers.'),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});


type ProfileFormValues = z.infer<typeof profileSchema>;

type CompleteProfileDialogProps = {
  open: boolean;
  onSuccess: () => void;
};

export function CompleteProfileDialog({ open, onSuccess }: CompleteProfileDialogProps) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const { showLoader, hideLoader } = useLoading();
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      realName: '',
      username: '',
      password: '',
      confirmPassword: ''
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(data: ProfileFormValues) {
    const user = auth.currentUser;
    if (!user || !user.email) {
      toast({ title: 'Error', description: 'You are not logged in or your email is missing.', variant: 'destructive' });
      return;
    }

    showLoader();
    
    try {
      // Step 1: Link password credential on the client-side
      try {
        const credential = EmailAuthProvider.credential(user.email, data.password);
        await linkWithCredential(user, credential);
      } catch (error: any) {
        if (error.code !== 'auth/provider-already-linked' && error.code !== 'auth/credential-already-in-use') {
           throw error;
        }
      }

      // Step 2: Update the user's display name on the client-side Auth object
      try {
          await updateProfile(user, { displayName: data.username });
      } catch (error: any) {
          console.warn("Could not set displayName on Auth user:", error);
      }

      // Step 3: Call the secure server action to validate and save the details to Firestore
      const idToken = await user.getIdToken();
      const result = await completeRegistration(idToken, data.username.toLowerCase(), data.realName);
      
      if (result.success) {
          toast({ title: 'Success!', description: 'Your profile is now complete.' });
          onSuccess();
          router.push('/');
      } else {
          throw new Error(result.message);
      }
    } catch (error: any) {
         toast({
            title: 'Profile Update Failed',
            description: error.message,
            variant: 'destructive'
        });
        form.reset({}, { keepValues: true });
    } finally {
        hideLoader();
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };


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
            Provide your real name and choose a unique username to finish creating your account.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="realName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Real Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="As per Government ID" 
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="6-12 lowercase letters & numbers" 
                      {...field}
                      onChange={(e) => {
                        field.onChange(e.target.value.toLowerCase());
                      }}
                       disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="At least 6 characters" 
                        {...field} 
                         disabled={isSubmitting}
                      />
                       <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground"
                          onClick={() => setShowPassword((prev) => !prev)}
                          disabled={isSubmitting}
                        >
                          {showPassword ? <EyeOff /> : <Eye />}
                        </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                     <div className="relative">
                        <Input 
                          type={showConfirmPassword ? "text" : "password"} 
                          placeholder="Re-enter your password" 
                          {...field} 
                           disabled={isSubmitting}
                        />
                         <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          disabled={isSubmitting}
                        >
                          {showConfirmPassword ? <EyeOff /> : <Eye />}
                        </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col gap-2 pt-4">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Submitting...' : 'Complete Profile'}
              </Button>
               <Button
                  type="button"
                  variant="link"
                  onClick={handleLogout}
                  disabled={isSubmitting}
                  className="w-auto h-auto px-3 py-1 text-xs text-muted-foreground hover:text-foreground/80 self-start"
              >
                Logout
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
