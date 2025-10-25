
"use client";

import Link from "next/link";
import { useState } from "react";
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
import { RecaptchaVerifier, signInWithPhoneNumber, signInWithPopup, ConfirmationResult } from "firebase/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TeamMember } from "@/lib/mock-data";
import { Separator } from "@/components/ui/separator";
import { GoogleIcon } from "@/components/GoogleIcon";


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

  const handleGoogleSignUp = async () => {
    if (!inGameUid) {
      toast({ title: "Error", description: "Please fill in your In-Game UID.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        toast({ title: "Registration Error", description: "This Google account is already registered.", variant: "destructive" });
        await auth.signOut();
        router.push('/login');
        return;
      }
      
      const nullValue = '\\\\\\\\\\\\';
      const duoTeamData = { name: nullValue, type: 'Duo', members: [{ inGameName: nullValue, inGameUid: nullValue }] };
      const squadTeamData = { name: nullValue, type: 'Squad', members: Array(3).fill({ inGameName: nullValue, inGameUid: nullValue }) };

      await setDoc(userDocRef, {
        inGameName: user.displayName || 'Gamer',
        inGameUid: inGameUid,
        phone: user.phoneNumber || 'Not provided',
        email: user.email,
        wallet: { deposit: 0, winning: 0, bonus: 0 },
        duoTeam: duoTeamData,
        squadTeam: squadTeamData,
        registeredOn: serverTimestamp(),
      });

      toast({ title: "Success", description: "Account created successfully!" });
      router.push("/");

    } catch (error: any) {
      console.error("Error creating account with Google:", error);
      toast({
        title: "Registration Error",
        description: error.message || "Failed to create account with Google.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-12">
       <div id="recaptcha-container"></div>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            Create your account to join tournaments.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="in-game-uid">In-Game UID</Label>
                <Input id="in-game-uid" placeholder="e.g. 1234567890" required value={inGameUid} onChange={(e) => setInGameUid(e.target.value)} disabled={otpSent}/>
            </div>
            
            <div className="flex items-center gap-4">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">OR</span>
                <Separator className="flex-1" />
            </div>

            <Button variant="outline" onClick={handleGoogleSignUp} disabled={loading}>
                <GoogleIcon className="mr-2 h-4 w-4" />
                Sign up with Google
            </Button>
            
            <p className="text-sm text-center text-muted-foreground pt-2">
                For phone number registration, fill out the fields below.
            </p>

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


          {otpSent && (
            <div className="grid gap-2">
              <Label htmlFor="otp">One-Time Password (OTP)</Label>
              <Input id="otp" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
            </div>
          )}

          <Button onClick={otpSent ? handleRegister : handleSendOtp} className="w-full" disabled={loading}>
            {loading ? 'Processing...' : (otpSent ? 'Create Account' : 'Send OTP')}
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

    
