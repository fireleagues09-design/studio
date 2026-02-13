
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
import { 
    signInWithEmailAndPassword, 
    sendEmailVerification, 
    fetchSignInMethodsForEmail, 
    signInWithPopup,
    GoogleAuthProvider,
    linkWithCredential,
    type AuthCredential,
    type User
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useLoading } from "@/context/LoadingContext";
import { GoogleLogo } from "@/components/GoogleLogo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { showLoader, hideLoader } = useLoading();

  // State for account linking flow
  const [isLinking, setIsLinking] = useState(false);
  const [linkingEmail, setLinkingEmail] = useState("");
  const [linkingCredential, setLinkingCredential] = useState<AuthCredential | null>(null);
  const [linkingPassword, setLinkingPassword] = useState("");
  const [showLinkingPassword, setShowLinkingPassword] = useState(false);
  const [linkingLoading, setLinkingLoading] = useState(false);

  useEffect(() => {
    hideLoader();
  }, [hideLoader]);

  // This centralized function ensures the Firestore document is always present after a successful auth event.
  const handleUserAfterLogin = async (user: User) => {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    const providers = user.providerData.map(p => p.providerId);

    if (!userDoc.exists()) {
        // This is the core fix: create the Firestore doc if it's missing for an existing Auth user.
        const newUsername = user.displayName?.replace(/\s/g, '').toLowerCase() || user.email?.split('@')[0] || `user${user.uid.substring(0, 5)}`;
        await setDoc(userDocRef, {
            username: newUsername,
            email: user.email,
            isRegistered: false, // Force profile completion if doc was missing
            emailVerified: user.emailVerified,
            wallet: { deposit: 0, winning: 0, bonus: 0 },
            registeredOn: serverTimestamp(),
            providers: providers,
        });
        toast({ title: "Welcome!", description: "Your account is ready. Let's complete your profile." });
    } else {
        // If doc exists, just ensure the providers list is up-to-date.
        await updateDoc(userDocRef, { providers });
        toast({ title: "Success", description: "Logged in successfully!" });
    }
    router.push("/");
  };


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
        
        if (!user.emailVerified) {
             toast({
                title: "Verification Required",
                description: "Your registration is incomplete. Please verify your email.",
            });
            if (!user.emailVerified) {
                await sendEmailVerification(user);
            }
            router.push('/auth/verify');
            return;
        }
        
        // All successful logins are handled by one function now
        await handleUserAfterLogin(user);

    } catch (error: any) {
        hideLoader();
        setLoading(false);
        console.error("Error signing in:", error);

        if (error.code === 'auth/invalid-credential') {
            try {
                const methods = await fetchSignInMethodsForEmail(auth, email);
                if (methods.length === 0) {
                    toast({
                        title: "Account Not Found",
                        description: "No account with this email exists. Redirecting to registration...",
                    });
                    router.push('/register');
                    return; 
                } else {
                    toast({ 
                        title: "Login Failed", 
                        description: "Incorrect password. Please try again.", 
                        variant: "destructive" 
                    });
                }
            } catch (fetchError) {
                    toast({ 
                    title: "Login Failed", 
                    description: "An error occurred while checking your email. Please try again.", 
                    variant: "destructive" 
                });
            }
        } else {
            toast({ 
                title: "Login Failed", 
                description: error.message || "An unknown error occurred. Please try again.", 
                variant: "destructive" 
            });
        }
    }
  };

  const handleAccountLink = async () => {
    if (!linkingEmail || !linkingPassword || !linkingCredential) {
        toast({ title: "Error", description: "Linking information is missing. Please try again.", variant: "destructive"});
        return;
    };
    setLinkingLoading(true);
    showLoader();

    try {
        // 1. Sign in with the original method (email/password) to verify ownership
        const userCredential = await signInWithEmailAndPassword(auth, linkingEmail, linkingPassword);
        const user = userCredential.user;

        // 2. Link the new Google credential to the now-signed-in user
        await linkWithCredential(user, linkingCredential);

        // 3. Let the unified handler deal with Firestore doc creation/update
        await handleUserAfterLogin(user);

    } catch (error: any) {
        hideLoader();
        setLinkingLoading(false);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
             toast({ title: "Linking Failed", description: "The password you entered was incorrect. Please try again.", variant: "destructive" });
        } else {
             toast({ title: "Linking Failed", description: error.message || "An unknown error occurred.", variant: "destructive" });
        }
    }
  };


  const handleGoogleLogin = async () => {
      setLoading(true);
      showLoader();
      try {
        const result = await signInWithPopup(auth, googleProvider);
        await handleUserAfterLogin(result.user);
      } catch (error: any) {
        hideLoader();
        setLoading(false);
        
        if (error.code === 'auth/account-exists-with-different-credential') {
            const email = error.customData.email;
            const credential = GoogleAuthProvider.credentialFromError(error);
            
            setLinkingEmail(email);
            setLinkingCredential(credential);
            setIsLinking(true);
            
            toast({ 
                title: "Account Exists", 
                description: "This email is already linked to a password account. Please enter your password to connect them.",
                duration: 6000
            });
        } else if (error.code !== 'auth/popup-closed-by-user') {
            toast({ title: "Login Failed", description: error.message || "Could not log in with Google.", variant: "destructive" });
        }
      }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-background text-foreground py-12 px-4">
        <Dialog open={isLinking} onOpenChange={setIsLinking}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                <DialogTitle>Link Google Account</DialogTitle>
                <DialogDescription>
                    The email <span className="font-semibold text-primary">{linkingEmail}</span> is already associated with a password-based account. To connect your Google account, please enter the password for that account.
                </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="link-password">Password</Label>
                    <div className="relative">
                    <Input
                        id="link-password"
                        type={showLinkingPassword ? "text" : "password"}
                        placeholder="Your original password"
                        required
                        value={linkingPassword}
                        onChange={(e) => setLinkingPassword(e.target.value)}
                        className="pr-10"
                        disabled={linkingLoading}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground"
                        onClick={() => setShowLinkingPassword((prev) => !prev)}
                    >
                        {showLinkingPassword ? <EyeOff /> : <Eye />}
                    </Button>
                    </div>
                </div>
                </div>
                <DialogFooter>
                <Button variant="outline" onClick={() => setIsLinking(false)} disabled={linkingLoading}>Cancel</Button>
                <Button onClick={handleAccountLink} disabled={linkingLoading}>
                    {linkingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {linkingLoading ? 'Linking...' : 'Link Accounts'}
                </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      <Card className="w-full max-w-sm mx-auto bg-card border-border shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>
            Enter your credentials to access your account.
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
