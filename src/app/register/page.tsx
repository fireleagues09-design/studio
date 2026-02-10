"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { 
    createUserWithEmailAndPassword, 
    sendEmailVerification, 
    updateProfile, 
    signInWithEmailAndPassword
} from "firebase/auth";
import { Eye, EyeOff, Info } from "lucide-react";
import { useLoading } from "@/context/LoadingContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { doc, getDoc } from "firebase/firestore";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEmailServiceDown, setIsEmailServiceDown] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { hideLoader, showLoader } = useLoading();

  useEffect(() => {
    hideLoader();
  }, [hideLoader]);

  const handleEmailRegister = async () => {
    if (!username || !email || !password || !confirmPassword) {
      toast({ title: "Error", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    if (username.length < 6 || username.length > 12) {
        toast({ title: "Error", description: "Username must be between 6 and 12 characters long.", variant: "destructive" });
        return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
        toast({ title: "Error", description: "Username can only contain letters and numbers.", variant: "destructive" });
        return;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }

    setLoading(true);
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: username });
        
        await sendEmailVerification(user);
        toast({
            title: 'Almost there!',
            description: "We've sent a verification link to your email.",
        });
        showLoader();
        router.push('/auth/verify');

    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            setLoading(true); // Keep loading indicator on for the recovery flow
             try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                if (!userCredential.user.emailVerified) {
                    await sendEmailVerification(userCredential.user);
                     toast({
                        title: 'Almost there!',
                        description: "We've sent a new verification link to your email.",
                    });
                    showLoader();
                    router.push('/auth/verify');
                } else {
                     const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
                     if (userDoc.exists()) {
                        toast({
                            title: 'Already Registered',
                            description: "This email is already registered and verified. Please log in.",
                        });
                        showLoader();
                        router.push('/login');
                     } else {
                         // This case is unlikely but handles if Firestore doc is missing for a verified user
                        await sendEmailVerification(userCredential.user);
                        toast({
                            title: 'Almost there!',
                            description: "Your account needs final setup. We've sent a new verification link.",
                        });
                        showLoader();
                        router.push('/auth/verify');
                     }
                }
             } catch (signInError: any) {
                setLoading(false); // Stop loading if sign-in fails (e.g. wrong password)
                toast({
                    title: 'Account Exists',
                    description: 'An account with this email already exists, but the password was incorrect. Please try logging in.',
                    variant: 'destructive',
                });
             }
        } else if (error.code === 'auth/quota-exceeded' || error.code === 'auth/too-many-requests') {
            setLoading(false);
            toast({
                title: "Registration Error",
                description: 'Our email service is temporarily at its limit. Please sign up with Google or try again later.',
                variant: 'destructive'
            });
            setIsEmailServiceDown(true);
        } else {
            setLoading(false);
            console.error("Error during registration:", error);
            toast({
                title: "Registration Error",
                description: error.message || 'Could not create your account. Please try again.',
                variant: "destructive",
            });
        }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-background text-foreground py-12 px-4">
      <Card className="w-full max-w-sm mx-auto bg-card border-border shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            Create your account to start competing.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Feature Update</AlertTitle>
                <AlertDescription>
                    Google Login/Registration is coming soon!
                </AlertDescription>
            </Alert>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            {isEmailServiceDown && (
                <Alert variant="destructive">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Email Registration Unavailable</AlertTitle>
                    <AlertDescription>
                        Our email service is temporarily down. Please try again later.
                    </AlertDescription>
                </Alert>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || isEmailServiceDown}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="6-12 characters"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading || isEmailServiceDown}
              />
              <p className="text-xs text-muted-foreground">Must be 6-12 characters long, letters and numbers only.</p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  disabled={loading || isEmailServiceDown}
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
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                  disabled={loading || isEmailServiceDown}
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
            </div>
            
            <Button onClick={handleEmailRegister} className="w-full mt-2" disabled={loading || isEmailServiceDown}>
                {loading ? 'Processing...' : 'Create Account'}
            </Button>
          
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline text-primary/90 hover:text-primary">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
