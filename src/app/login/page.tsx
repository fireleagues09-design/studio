
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
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, sendEmailVerification, fetchSignInMethodsForEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Eye, EyeOff, Info } from "lucide-react";
import { useLoading } from "@/context/LoadingContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { showLoader, hideLoader } = useLoading();

  useEffect(() => {
    hideLoader();
  }, [hideLoader]);

  const handleEmailLogin = async () => {
    if (!email || !password) {
        toast({ title: "Error", description: "Please enter email and password.", variant: "destructive" });
        return;
    }
    setLoading(true);
    showLoader();
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        // If the user's profile doesn't exist in the database, registration is incomplete.
        // Send them to the verification page to create the profile.
        if (!userDoc.exists()) {
            toast({
                title: "Registration Incomplete",
                description: "Please complete your registration by verifying your email.",
            });
            router.push('/auth/verify');
            return;
        }
        
        // If the profile exists, but the email is not verified, guide them to verification.
        if (!user.emailVerified) {
            toast({
                title: "Verification Required",
                description: "Your email is not verified. Please check your inbox for the verification link.",
            });
            await sendEmailVerification(user);
            router.push('/auth/verify');
            return; 
        }

        // Successful login for existing user
        toast({ title: "Success", description: "Logged in successfully!" });
        router.push("/");

    } catch (error: any) {
        if (error.code === 'auth/invalid-credential') {
            try {
                const methods = await fetchSignInMethodsForEmail(auth, email);
                if (methods.length === 0) {
                    // No account exists with this email.
                    toast({
                        title: "Account Not Found",
                        description: "This email isn't registered. Redirecting to sign up page.",
                    });
                    router.push('/register');
                    return;
                } else {
                    // An account exists, so the password was wrong.
                    toast({
                        title: "Login Failed",
                        description: "Incorrect password. Please check your credentials and try again.",
                        variant: "destructive",
                    });
                }
            } catch (fetchError) {
                // If checking for email fails, fall back to a generic error message.
                console.error("Error checking for email existence:", fetchError);
                toast({
                    title: "Login Failed",
                    description: "Invalid email or password. Please try again.",
                    variant: "destructive",
                });
            }
        } else {
            console.error("Error signing in:", error);
            toast({ title: "Login Failed", description: "An unexpected error occurred during login. Please try again.", variant: "destructive" });
        }
        setLoading(false);
        hideLoader();
    }
  };

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
