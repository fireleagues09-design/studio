
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
import { signInWithEmailAndPassword, signInWithPopup, UserCredential, sendEmailVerification } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { GoogleLogo } from "@/components/GoogleLogo";
import { Eye, EyeOff } from "lucide-react";
import { useLoading } from "@/context/LoadingContext";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { hideLoader } = useLoading();

  useEffect(() => {
    hideLoader();
  }, [hideLoader]);

  const handleAuthSuccess = async (userCredential: UserCredential) => {
    const user = userCredential.user;
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        await auth.signOut();
        toast({
            title: "Login Failed",
            description: "No account found with this email. Please sign up first.",
            variant: "destructive"
        });
        router.push('/register');
        return;
    }

    toast({ title: "Success", description: "Logged in successfully!" });
    router.push("/");
  };
  
  const handleEmailLogin = async () => {
    if (!email || !password) {
        toast({ title: "Error", description: "Please enter email and password.", variant: "destructive" });
        return;
    }
    setLoading(true);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        if (!userCredential.user.emailVerified) {
            toast({
                title: "Email Not Verified",
                description: "Please check your inbox and verify your email before logging in.",
                variant: "destructive",
                duration: 10000,
                action: (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                            setIsResending(true);
                            try {
                                await sendEmailVerification(userCredential.user);
                                toast({
                                    title: "Link Sent!",
                                    description: "A new verification link has been sent to your email.",
                                });
                            } catch (e) {
                                toast({
                                    title: "Error",
                                    description: "Failed to send new verification link.",
                                    variant: "destructive"
                                });
                            } finally {
                                setIsResending(false);
                            }
                        }}
                        disabled={isResending}
                    >
                        {isResending ? "Sending..." : "Resend Link"}
                    </Button>
                )
            });
            await auth.signOut();
            setLoading(false);
            return;
        }

        await handleAuthSuccess(userCredential);
      } catch (error: any) {
        console.error("Error signing in:", error);
        let description = "Failed to login. Please check your credentials.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          description = "Invalid email or password.";
        }
        toast({ title: "Login Error", description, variant: "destructive" });
      } finally {
        setLoading(false);
      }
  };

  const handleGoogleLogin = async () => {
      setLoading(true);
      try {
        const result = await signInWithPopup(auth, googleProvider);
        await handleAuthSuccess(result);
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
