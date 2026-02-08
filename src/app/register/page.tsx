
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
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { signInWithPopup, UserCredential, getAdditionalUserInfo, sendSignInLinkToEmail, fetchSignInMethodsForEmail } from "firebase/auth";
import { GoogleLogo } from "@/components/GoogleLogo";
import { Eye, EyeOff, Info } from "lucide-react";
import { useLoading } from "@/context/LoadingContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [inGameName, setInGameName] = useState(""); // This is "Username" in the UI
  const [loading, setLoading] = useState(false);
  const [isEmailServiceDown, setIsEmailServiceDown] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { hideLoader } = useLoading();

  useEffect(() => {
    hideLoader();
  }, [hideLoader]);

  const handleAuthSuccess = async (userCredential: UserCredential) => {
    const additionalInfo = getAdditionalUserInfo(userCredential);
    const user = userCredential.user;

    // Handle existing users first
    if (!additionalInfo?.isNewUser) {
        toast({
            title: "Welcome Back!",
            description: "Logged in successfully.",
        });
        router.push("/");
        return;
    }

    // Handle new users from Google sign-up
    try {
        const userData: any = {
            email: user.email,
            wallet: { deposit: 0, winning: 0, bonus: 0 },
            registeredOn: serverTimestamp(),
            isRegistered: false, // This flag will trigger the username prompt
        };

        if (user.phoneNumber) {
            userData.phone = user.phoneNumber;
        }

        await setDoc(doc(db, "users", user.uid), userData);

        toast({
            title: "Account Created!",
            description: "Let's set up your username.",
        });
        router.push("/complete-profile");
    } catch(error: any) {
        console.error("Error saving partial user profile:", error);
        // Important: If doc creation fails, we must delete the auth user to allow a retry.
        await userCredential.user.delete().catch(e => console.error("Failed to delete auth user on error:", e));
        await auth.signOut(); // And sign out
        toast({ title: "Registration Error", description: error.message || 'Failed to create user profile.', variant: 'destructive' });
    }
  };

  const validateUsername = async (username: string) => {
    if (username.length < 6 || username.length > 12) {
      toast({ title: "Invalid Username", description: "Username must be between 6 and 12 characters long.", variant: "destructive" });
      return false;
    }
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      toast({ title: "Invalid Username", description: "Username can only contain letters and numbers.", variant: "destructive" });
      return false;
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("inGameName", "==", username));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast({
          title: "Registration Error",
          description: "This username is already taken. Please choose another one.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Username validation error:", error);
      toast({ title: "Error", description: "Could not validate username. Please try again.", variant: "destructive"});
      return false;
    }

    return true;
  };


  const handleEmailRegister = async () => {
    if (!email || !password || !inGameName || !confirmPassword) {
      toast({ title: "Error", description: "Please fill in all fields.", variant: "destructive" });
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
        const isUsernameValid = await validateUsername(inGameName);
        if (!isUsernameValid) {
            setLoading(false);
            return;
        }

        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.length > 0) {
            toast({
                title: "Registration Error",
                description: "This email is already registered. Please log in.",
                variant: "destructive",
            });
            setLoading(false);
            return;
        }

        const actionCodeSettings = {
            url: `${window.location.origin}/auth/verify`,
            handleCodeInApp: true,
        };

        await sendSignInLinkToEmail(auth, email, actionCodeSettings);

        const registrationDetails = { email, password, inGameName };
        window.localStorage.setItem('registrationDetails', JSON.stringify(registrationDetails));

        router.push('/auth/verify');

    } catch (error: any) {
        console.error("Error during registration initiation:", error);
        let errorMessage = "Could not start the registration process. Please try again.";
        if (error.code === 'auth/quota-exceeded') {
            errorMessage = 'Our email service is temporarily at its limit. Please sign up with Google or try again later.';
            setIsEmailServiceDown(true);
        }
        toast({
            title: "Registration Error",
            description: errorMessage,
            variant: "destructive",
        });
        setLoading(false);
    }
  };

  const startGoogleSignUp = async () => {
    setLoading(true);
    try {
        const result = await signInWithPopup(auth, googleProvider);
        // handleAuthSuccess will now manage new vs existing users
        // and create a partial profile for new users.
        await handleAuthSuccess(result);
    } catch (error: any) {
        console.error("Google sign up error:", error);
        if (error.code !== 'auth/popup-closed-by-user') {
            toast({ title: "Sign-up Failed", description: error.message || "Could not sign up with Google.", variant: "destructive" });
        }
    } finally {
        setLoading(false);
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
            <Button variant="outline" className="w-full" onClick={startGoogleSignUp} disabled={loading}>
              <GoogleLogo className="mr-2 h-4 w-4" />
              Sign up with Google
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

            {isEmailServiceDown && (
                <Alert variant="destructive">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Email Registration Unavailable</AlertTitle>
                    <AlertDescription>
                        Our email service is temporarily down. Please use Google Sign-Up above or try again later.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="in-game-name">Username</Label>
              <Input
                id="in-game-name"
                placeholder="6-12 character username"
                required
                value={inGameName}
                onChange={(e) => setInGameName(e.target.value)}
                disabled={loading || isEmailServiceDown}
              />
              <p className="text-xs text-muted-foreground">Must be 6-12 characters, letters and numbers only.</p>
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
                {loading ? 'Creating Account...' : 'Create Account'}
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
