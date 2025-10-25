
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
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, signInWithRedirect, getRedirectResult, UserCredential } from "firebase/auth";
import type { TeamMember } from "@/lib/mock-data";


// Add a global declaration for the confirmationResult
declare global {
    interface Window {
      recaptchaVerifier?: RecaptchaVerifier;
      confirmationResult?: ConfirmationResult;
    }
  }

export default function RegisterPage() {
  const [inGameName, setInGameName] = useState("");
  const [inGameUid, setInGameUid] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Team state
  const [duoTeamName, setDuoTeamName] = useState("");
  const [squadTeamName, setSquadTeamName] = useState("");
  const [duoMembers, setDuoMembers] = useState<TeamMember[]>(Array(1).fill({ inGameName: '', inGameUid: '' }));
  const [squadMembers, setSquadMembers] = useState<TeamMember[]>(Array(3).fill({ inGameName: '', inGameUid: '' }));

  useEffect(() => {
    const handleRedirectResult = async () => {
        setLoading(true);
        try {
            const result = await getRedirectResult(auth);
            if (result) {
                // User signed up with Google, now we need to save their info
                await handleGoogleSignUp(result);
            }
        } catch (error: any) {
            console.error("Google sign-up redirect error:", error);
            toast({ title: "Sign-up Failed", description: error.message || "Could not sign up with Google.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    handleRedirectResult();
  }, [toast, router]);

  const handleGoogleSignUp = async (userCredential: UserCredential) => {
    const user = userCredential.user;
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        toast({ title: "Registration Error", description: "This account is already registered. Please log in.", variant: "destructive" });
        router.push('/login');
        return;
    }
    
    // For Google Sign-Up, we don't have In-Game Name/UID or teams yet.
    // We'll use their Google display name as a placeholder and create null teams.
    const nullValue = '\\\\\\\\\\\\';
    
    try {
        await setDoc(userDocRef, {
            inGameName: user.displayName || 'New Player',
            inGameUid: nullValue, // User needs to update this
            phone: user.phoneNumber || nullValue, // May not be available
            email: user.email,
            wallet: { deposit: 0, winning: 0, bonus: 0 },
            duoTeam: { name: nullValue, type: 'Duo', members: Array(1).fill({ inGameName: nullValue, inGameUid: nullValue }) },
            squadTeam: { name: nullValue, type: 'Squad', members: Array(3).fill({ inGameName: nullValue, inGameUid: nullValue }) },
            registeredOn: serverTimestamp(),
        });

        toast({
            title: "Welcome!",
            description: "Account created successfully with Google! Please complete your profile.",
        });
        router.push("/profile"); // Redirect to profile to complete details.
    } catch(error: any) {
        console.error("Error saving Google user:", error);
        toast({ title: "Registration Error", description: error.message, variant: 'destructive' });
    }
  };


  const handleMemberChange = (index: number, field: 'inGameName' | 'inGameUid', value: string, type: 'duo' | 'squad') => {
    if (type === 'duo') {
        const newMembers = [...duoMembers];
        newMembers[index] = { ...newMembers[index], [field]: value };
        setDuoMembers(newMembers);
    } else {
        const newMembers = [...squadMembers];
        newMembers[index] = { ...newMembers[index], [field]: value };
        setSquadMembers(newMembers);
    }
  };
  
  const handleNullButtonClick = () => {
    const nullValue = '\\\\\\\\\\\\';
    setDuoTeamName(nullValue);
    setSquadTeamName(nullValue);
    setDuoMembers(Array(1).fill({ inGameName: nullValue, inGameUid: nullValue }));
    setSquadMembers(Array(3).fill({ inGameName: nullValue, inGameUid: nullValue }));
  }

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
      });
    }
    return window.recaptchaVerifier;
  };

  const handleSendOtp = async () => {
    if (!inGameName || !phone || !inGameUid) {
      toast({ title: "Error", description: "Please fill in all required personal fields.", variant: "destructive" });
      return;
    }
    
    if (!duoTeamName || !squadTeamName) {
        toast({ title: "Error", description: "Please provide team names for both Duo and Squad.", variant: "destructive"});
        return;
    }

    const areDuoTeammatesValid = duoMembers.every(tm => tm.inGameName.trim() !== '' && tm.inGameUid.trim() !== '');
    if (!areDuoTeammatesValid) {
         toast({
            title: "Incomplete Duo Team",
            description: `Please fill out all In-Game Names and UIDs for your Duo members.`,
            variant: "destructive",
        });
        return;
    }
    
    const areSquadTeammatesValid = squadMembers.every(tm => tm.inGameName.trim() !== '' && tm.inGameUid.trim() !== '');
    if (!areSquadTeammatesValid) {
         toast({
            title: "Incomplete Squad Team",
            description: `Please fill out all In-Game Names and UIDs for your Squad members.`,
            variant: "destructive",
        });
        return;
    }


    setLoading(true);
    try {
      const phoneNumber = `+91${phone}`;
      const appVerifier = setupRecaptcha();
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      window.confirmationResult = confirmationResult;
      setOtpSent(true);
      toast({ title: "Success", description: "OTP sent to your phone!" });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      let description = "Failed to send OTP. Please try again.";
      if (error.code === 'auth/too-many-requests') {
        description = "You have requested too many OTPs. Please try again later.";
      } else if (error.message && error.message.includes('reCAPTCHA client element has been removed')) {
          description = "OTP Error Please Refresh The Page";
      } else if (error.message) {
        description = error.message;
      }
      toast({ title: "OTP Error", description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };


  const handleRegister = async () => {
    if (!otp) {
      toast({ title: "Error", description: "Please enter the OTP.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
        if (!window.confirmationResult) {
            throw new Error("OTP not sent yet or session expired.");
        }
        const userCredential = await window.confirmationResult.confirm(otp);
        const user = userCredential.user;

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            toast({ title: "Registration Error", description: "This phone number is already registered.", variant: "destructive" });
            router.push('/login');
            setLoading(false);
            return;
        }

        const duoTeamData = {
            name: duoTeamName,
            type: 'Duo',
            members: duoMembers
        };
        const squadTeamData = {
            name: squadTeamName,
            type: 'Squad',
            members: squadMembers
        };

        await setDoc(userDocRef, {
          inGameName: inGameName,
          inGameUid: inGameUid,
          phone: `+91${phone}`,
          email: user.email || `${phone}@fireleagues.com`,
          wallet: {
            deposit: 0,
            winning: 0,
            bonus: 0,
          },
          duoTeam: duoTeamData,
          squadTeam: squadTeamData,
          registeredOn: serverTimestamp(),
        });
        
        toast({
          title: "Success",
          description: "Account created successfully!",
        });

        router.push("/");

      } catch (error: any) {
        console.error("Error creating account:", error);
        toast({
          title: "Registration Error",
          description: error.message || "Failed to create account. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
  };

    const startGoogleSignUp = async () => {
        setLoading(true);
        await signInWithRedirect(auth, googleProvider);
    };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-12">
       <div id="recaptcha-container"></div>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            { otpSent ? "Verify your phone to complete registration" : "Create your account to join tournaments." }
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
            {!otpSent && (
                <>
                    <div className="relative mb-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Sign up with Google</span>
                        </div>
                    </div>

                    <Button variant="outline" className="w-full" onClick={startGoogleSignUp} disabled={loading}>
                        {loading ? 'Processing...' : 'Sign up with Google'}
                    </Button>
                    
                    <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or with phone</span>
                        </div>
                    </div>


                    <div className="grid gap-2">
                        <Label htmlFor="in-game-uid">In-Game UID</Label>
                        <Input id="in-game-uid" placeholder="e.g. 1234567890" required value={inGameUid} onChange={(e) => setInGameUid(e.target.value)} disabled={otpSent}/>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="in-game-name">In-Game Name</Label>
                        <Input id="in-game-name" placeholder="ProGamer" required value={inGameName} onChange={(e) => setInGameName(e.target.value)} disabled={otpSent}/>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="flex items-center">
                            <span className="h-10 flex items-center justify-center rounded-l-md border border-r-0 border-input bg-background px-3 text-muted-foreground text-sm">+91</span>
                            <Input id="phone" type="tel" placeholder="0000000000" required value={phone} onChange={(e) => setPhone(e.target.value)} disabled={otpSent} className="rounded-l-none"/>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-lg font-semibold">Register Your Duo Team</h3>
                        <div className="grid gap-2">
                            <Label htmlFor="duo-team-name">Duo Team Name</Label>
                            <Input id="duo-team-name" value={duoTeamName} onChange={e => setDuoTeamName(e.target.value)} placeholder="e.g. The Duo Champions" disabled={otpSent} required/>
                        </div>
                        
                        {Array.from({ length: 1 }).map((_, index) => (
                        <div key={`duo-${index}`} className="p-3 border rounded-md space-y-2 bg-secondary/30">
                            <Label>Teammate {index + 1}</Label>
                            <Input 
                                    placeholder="In-Game Name" 
                                    value={duoMembers[index]?.inGameName || ''} 
                                    onChange={(e) => handleMemberChange(index, 'inGameName', e.target.value, 'duo')} 
                                    required
                                    disabled={otpSent}
                                />
                            <Input 
                                    placeholder="In-Game UID" 
                                    value={duoMembers[index]?.inGameUid || ''} 
                                    onChange={(e) => handleMemberChange(index, 'inGameUid', e.target.value, 'duo')} 
                                    required
                                    disabled={otpSent}
                                />
                        </div>
                        ))}
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-lg font-semibold">Register Your Squad Team</h3>
                        <div className="grid gap-2">
                            <Label htmlFor="squad-team-name">Squad Team Name</Label>
                            <Input id="squad-team-name" value={squadTeamName} onChange={e => setSquadTeamName(e.target.value)} placeholder="e.g. The Squad Champions" disabled={otpSent} required/>
                        </div>
                        
                        {Array.from({ length: 3 }).map((_, index) => (
                        <div key={`squad-${index}`} className="p-3 border rounded-md space-y-2 bg-secondary/30">
                            <Label>Teammate {index + 1}</Label>
                            <Input 
                                    placeholder="In-Game Name" 
                                    value={squadMembers[index]?.inGameName || ''} 
                                    onChange={(e) => handleMemberChange(index, 'inGameName', e.target.value, 'squad')} 
                                    required
                                    disabled={otpSent}
                                />
                            <Input 
                                    placeholder="In-Game UID" 
                                    value={squadMembers[index]?.inGameUid || ''} 
                                    onChange={(e) => handleMemberChange(index, 'inGameUid', e.target.value, 'squad')} 
                                    required
                                    disabled={otpSent}
                                />
                        </div>
                        ))}
                    </div>
                    
                    <div className="pt-4 border-t">
                        <p className="text-xs text-center text-muted-foreground pt-2">
                            if you don't have team members, then click on the null button down below. you can add team members later by contacting players support
                        </p>
                        <Button variant="outline" onClick={handleNullButtonClick} disabled={otpSent} className="w-full mt-2">
                            Null
                        </Button>
                    </div>
                </>
            )}

            {otpSent && (
                <div className="grid gap-2">
                    <Label htmlFor="otp">One-Time Password (OTP)</Label>
                    <Input id="otp" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
                </div>
            )}

            <Button onClick={otpSent ? handleRegister : handleSendOtp} className="w-full" disabled={loading}>
                {loading ? 'Processing...' : (otpSent ? 'Create Account' : 'Send OTP & Register')}
            </Button>


            <div className="mt-4 text-center text-sm">
                By signing up, you agree to our{' '}
                <Link href="/terms" className="underline">
                    Terms and Conditions
                </Link>.
            </div>
            <div className="mt-2 text-center text-sm">
                Already have an account?{" "}
                <Link href="/login" className="underline">
                    Login
                </Link>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
