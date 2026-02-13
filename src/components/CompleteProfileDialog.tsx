
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
import { Loader2, Eye, EyeOff } from 'lucide-react';

const profileSchema = z.object({
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
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: ''
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
      const result = await completeRegistration(idToken, data.username.toLowerCase(), data.password);
      
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
            Choose a unique username and set a password to finish creating your account.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
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
                      />
                       <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground"
                          onClick={() => setShowPassword((prev) => !prev)}
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
                        />
                         <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                        >
                          {showConfirmPassword ? <EyeOff /> : <Eye />}
                        </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
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
