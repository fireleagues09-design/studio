
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
    signInWithPopup,
    GoogleAuthProvider,
    linkWithCredential,
    type AuthCredential,
    type User
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, onSnapshot } from "firebase/firestore";
import { Eye, EyeOff, Loader2, AlertTriangle, Lock } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Access Control States
  const [authConfig, setAuthConfig] = useState({
    emailLoginEnabled: true,
    googleLoginEnabled: true,
    maintenanceNote: ""
  });
  const [configLoading, setConfigLoading] = useState(true);

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
    const unsubscribe = onSnapshot(doc(db, 'settings', 'auth_config'), (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            setAuthConfig({
                emailLoginEnabled: data.emailLoginEnabled ?? true,
                googleLoginEnabled: data.googleLoginEnabled ?? true,
                maintenanceNote: data.maintenanceNote ?? ""
            });
        }
        setConfigLoading(false);
        hideLoader();
    });
    return () => unsubscribe();
  }, [hideLoader]);

  // This centralized function ensures the Firestore document is always present after a successful auth event.
  const handleUserAfterLogin = async (user: User) => {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    const providers = user.providerData.map(p => p.providerId);
    const isGoogleUser = providers.includes('google.com');

    if (!userDoc.exists()) {
        const newUsername = user.displayName?.replace(/\s/g, '').toLowerCase() || user.email?.split('@')[0] || `user${user.uid.substring(0, 5)}`;
        await setDoc(userDocRef, {
            username: newUsername,
            email: user.email,
            isRegistered: false,
            emailVerified: user.emailVerified || isGoogleUser,
            wallet: { deposit: 0, winning: 0, bonus: 0 },
            registeredOn: serverTimestamp(),
            lastLogin: serverTimestamp(),
            providers: providers,
        });
        toast({ title: "Welcome!", description: "Your account is ready. Let's complete your profile." });
    } else {
        const existingData = userDoc.data();
        const updatePayload: {providers: string[]; lastLogin: any; emailVerified?: boolean} = {
            providers: providers,
            lastLogin: serverTimestamp()
        };

        if (isGoogleUser && !existingData.emailVerified) {
            updatePayload.emailVerified = true;
        }

        try {
          await updateDoc(userDocRef, updatePayload);
        } catch (error) {
          console.warn("Could not update user providers/lastLogin:", error);
        }
        toast({ title: "Success", description: "Logged in successfully!" });
    }
    router.push("/");
  };


  const handleEmailLogin = async () => {
    if (!authConfig.emailLoginEnabled) {
        toast({ title: "Login Disabled", description: authConfig.maintenanceNote || "Email login is temporarily disabled.", variant: "destructive" });
        return;
    }
    if (!email || !password) {
        toast({ title: "Error", description: "Please enter email and password.", variant: "destructive" });
        return;
    }
    setLoading(true);
    showLoader();
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await handleUserAfterLogin(userCredential.user);
    } catch (error: any) {
        hideLoader();
        setLoading(false);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            toast({ title: "Login Failed", description: "Incorrect credentials.", variant: "destructive" });
        } else {
            toast({ title: "Login Failed", description: error.message, variant: "destructive" });
        }
    }
  };

  const handleAccountLink = async () => {
    if (!linkingEmail || !linkingPassword || !linkingCredential) return;
    setLinkingLoading(true);
    showLoader();
    try {
        const userCredential = await signInWithEmailAndPassword(auth, linkingEmail, linkingPassword);
        const user = userCredential.user;
        await linkWithCredential(user, linkingCredential);
        await handleUserAfterLogin(user);
    } catch (error: any) {
        hideLoader();
        setLinkingLoading(false);
        toast({ title: "Linking Failed", description: "Invalid password.", variant: "destructive" });
    }
  };


  const handleGoogleLogin = async () => {
      if (!authConfig.googleLoginEnabled) {
          toast({ title: "Login Disabled", description: authConfig.maintenanceNote || "Google login is temporarily disabled.", variant: "destructive" });
          return;
      }
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
        } else if (error.code !== 'auth/popup-closed-by-user') {
            toast({ title: "Login Failed", description: error.message, variant: "destructive" });
        }
      }
  }

  if (configLoading) return null;

  const isAllDisabled = !authConfig.emailLoginEnabled && !authConfig.googleLoginEnabled;

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-background text-foreground py-12 px-4">
        <Dialog open={isLinking} onOpenChange={setIsLinking}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                <DialogTitle>Link Google Account</DialogTitle>
                <DialogDescription>
                    The email <span className="font-semibold text-primary">{linkingEmail}</span> is linked to a password account. Enter password to connect.
                </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="link-password">Password</Label>
                    <div className="relative">
                    <Input
                        id="link-password"
                        type={showLinkingPassword ? "text" : "password"}
                        value={linkingPassword}
                        onChange={(e) => setLinkingPassword(e.target.value)}
                        className="pr-10"
                        disabled={linkingLoading}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-y-0 right-0 h-full w-10"
                        onClick={() => setShowLinkingPassword((prev) => !prev)}
                    >
                        {showLinkingPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    </div>
                </div>
                </div>
                <DialogFooter>
                <Button variant="outline" onClick={() => setIsLinking(false)} disabled={linkingLoading}>Cancel</Button>
                <Button onClick={handleAccountLink} disabled={linkingLoading}>
                    {linkingLoading ? 'Linking...' : 'Link Accounts'}
                </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      <Card className="w-full max-w-sm mx-auto bg-card border-border shadow-lg overflow-hidden">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>
            {isAllDisabled ? "Login is temporarily restricted." : "Enter your credentials to access your account."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
            
            {authConfig.googleLoginEnabled ? (
                <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
                    <GoogleLogo className="mr-2 h-5 w-5" />
                    Continue with Google
                </Button>
            ) : (
                <Alert className="bg-secondary/50 border-none">
                    <Lock className="h-4 w-4" />
                    <AlertDescription className="text-xs">Google Login is restricted.</AlertDescription>
                </Alert>
            )}
            
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            {authConfig.emailLoginEnabled ? (
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                            id="email" 
                            type="email" 
                            placeholder="name@example.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                        <Input 
                            id="password" 
                            type={showPassword ? "text" : "password"} 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={loading}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        </div>
                    </div>
                    <Button onClick={handleEmailLogin} disabled={loading} className="w-full font-bold">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Login
                    </Button>
                </div>
            ) : (
                <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="text-xs font-bold uppercase tracking-widest">Notice</AlertTitle>
                    <AlertDescription className="text-xs mt-1">
                        {authConfig.maintenanceNote || "Email login is currently disabled for maintenance."}
                    </AlertDescription>
                </Alert>
            )}

          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline text-primary/90 hover:text-primary font-bold">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
