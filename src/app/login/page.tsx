
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/hooks/use-toast";
import { auth, db, googleProvider } from "@/lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup, UserCredential, sendEmailVerification, getAdditionalUserInfo, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { GoogleLogo } from "@/components/GoogleLogo";
import { Eye, EyeOff } from "lucide-react";
import { useLoading } from "@/context/LoadingContext";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { hideLoader } = useLoading();

  useEffect(() => {
    hideLoader();
  }, [hideLoader]);

  const handleLoginSuccess = async (userCredential: UserCredential) => {
    const user = userCredential.user;
    const userDocRef = doc(db, "users", user.uid);

    try {
        const userDoc = await getDoc(userDocRef);

        // CASE 1: Auth user exists, but Firestore doc is missing.
        // This means they are not registered in our system.
        if (!userDoc.exists()) {
            await signOut(auth);
            toast({
                title: "Account Not Found",
                description: "No account found with this email. Please register first.",
                variant: "destructive",
            });
            router.push('/register');
            return;
        }
        
        // CASE 2: Firestore doc exists, but email is not verified
        if (!user.emailVerified) {
            toast({
                title: "Email Not Verified",
                description: "Redirecting you to the verification page to complete your registration.",
            });
            await sendEmailVerification(user); // Resend link
            router.push('/auth/verify');
            return;
        }
        
        // CASE 3: User is fully authenticated and verified. Log them in.
        toast({ title: "Success", description: "Logged in successfully!" });
        router.push("/");

    } catch (error: any) {
        console.error("Error during login success handling:", error);
        toast({ title: "Login Error", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
        setLoading(false);
    }
  };
  
  const handleEmailLogin = async () => {
    if (!email || !password) {
        toast({ title: "Error", description: "Please enter email and password.", variant: "destructive" });
        return;
    }
    setLoading(true);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await handleLoginSuccess(userCredential);
    } catch (error: any) {
        let description: string;
        // The 'auth/invalid-credential' error code covers wrong password, and often user-not-found in newer SDKs.
        // We handle it gracefully by showing a toast without logging a console error, as it's an expected user input error.
        if (error.code === 'auth/invalid-credential') {
          description = "Invalid email or password. Please check your credentials and try again.";
        } else {
          // Log other, unexpected errors to the console for debugging.
          console.error("Error signing in:", error);
          description = "An unexpected error occurred during login. Please try again.";
        }
        toast({ title: "Login Failed", description, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
      setLoading(true);
      try {
        const result = await signInWithPopup(auth, googleProvider);
        await handleLoginSuccess(result);
      } catch (error: any) {
        console.error("Google login error:", error);
        if (error.code !== 'auth/popup-closed-by-user') {
            toast({ title: "Login Failed", description: error.message || "Could not log in with Google.", variant: "destructive" });
        }
      } finally {
        setLoading(false);
      }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-background text-foreground py-12 px-4">
      <Card className="w-full max-w-sm mx-auto bg-card border-border shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>
            Enter your credentials to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
            <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
              <GoogleLogo className="mr-2 h-4 w-4" />
              {loading ? 'Processing...' : 'Sign in with Google'}
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
              <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading}/>
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
                disabled={loading}
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
          
          <Button onClick={handleEmailLogin} className="w-full mt-2" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>

          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline text-primary/90 hover:text-primary">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
