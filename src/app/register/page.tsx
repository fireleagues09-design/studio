
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
import { db, auth, googleProvider } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { 
    createUserWithEmailAndPassword, 
    sendEmailVerification, 
    updateProfile,
    signInWithEmailAndPassword,
    signInWithPopup
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Eye, EyeOff } from "lucide-react";
import { useLoading } from "@/context/LoadingContext";
import { GoogleLogo } from "@/components/GoogleLogo";

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
    showLoader();
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: username });

        // Create Firestore document for the new user
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
            username: username,
            email: user.email,
            isRegistered: true, // Email/pass users are registered but need to verify email
            emailVerified: false,
            wallet: { deposit: 0, winning: 0, bonus: 0 },
            createdAt: serverTimestamp(),
        });
        
        await sendEmailVerification(user);

        toast({
            title: 'Registration Successful!',
            description: "Welcome! A verification link has been sent to your email. Please verify to get full access.",
        });
        router.push('/auth/verify');

    } catch (error: any) {
        setLoading(false);
        hideLoader();
        if (error.code === 'auth/email-already-in-use') {
             try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                if (!userCredential.user.emailVerified) {
                    await sendEmailVerification(userCredential.user);
                     toast({
                        title: 'Almost there!',
                        description: "We've sent a new verification link to your email.",
                    });
                    router.push('/auth/verify');
                } else {
                     const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
                     if (userDoc.exists()) {
                        toast({
                            title: 'Already Registered',
                            description: "This email is already registered and verified. Please log in.",
                        });
                        router.push('/login');
                     } else {
                         // This case is unlikely but handles if Firestore doc is missing for a verified user
                        await sendEmailVerification(userCredential.user);
                        toast({
                            title: 'Almost there!',
                            description: "Your account needs final setup. We've sent a new verification link.",
                        });
                        router.push('/auth/verify');
                     }
                }
             } catch (signInError: any) {
                setLoading(false);
                hideLoader();
                toast({
                    title: 'Account Exists',
                    description: 'An account with this email already exists, but the password was incorrect. Please try logging in.',
                    variant: 'destructive',
                });
             }
        } else if (error.code === 'auth/quota-exceeded' || error.code === 'auth/too-many-requests') {
            setLoading(false);
            hideLoader();
            toast({
                title: "Registration Error",
                description: 'Our email service is temporarily at its limit. Please try again later.',
                variant: 'destructive'
            });
            setIsEmailServiceDown(true);
        } else {
            setLoading(false);
            hideLoader();
            console.error("Error during registration:", error);
            toast({
                title: "Registration Error",
                description: error.message || 'Could not create your account. Please try again.',
                variant: "destructive",
            });
        }
    }
  };
  
  const handleGoogleLogin = async () => {
      setLoading(true);
      showLoader();
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            // Existing user, just log them in. The header will handle profile completion if needed.
            toast({ title: "Success", description: "Logged in successfully!" });
        } else {
            // This is a brand new Google user. Create a partial profile.
            const newUsername = user.displayName?.replace(/\s/g, '').toLowerCase() || user.email?.split('@')[0] || `user${user.uid.substring(0, 5)}`;

            await setDoc(userDocRef, {
                username: newUsername,
                email: user.email,
                isRegistered: false, // Crucial flag for profile completion step
                emailVerified: true, // Google email is verified by default
                wallet: { deposit: 0, winning: 0, bonus: 0 },
                registeredOn: serverTimestamp(),
            });
            toast({ title: "Welcome!", description: "Just one more step to complete your profile." });
        }
        router.push('/');
      } catch (error: any) {
        hideLoader();
        setLoading(false);
        if (error.code !== 'auth/popup-closed-by-user') {
            toast({ title: "Login Failed", description: error.message || "Could not log in with Google.", variant: "destructive" });
        }
      }
  }

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
            <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
              <GoogleLogo className="mr-2 h-5 w-5" />
              Continue with Google
            </Button>

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
