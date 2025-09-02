
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
import { db, auth } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [teamName, setTeamName] = useState("");
  const [teamType, setTeamType] = useState<'Duo' | 'Squad' | ''>('');
  const [teammates, setTeammates] = useState<TeamMember[]>([]);

  const handleMemberChange = (index: number, field: 'inGameName' | 'inGameUid', value: string) => {
    const newTeammates = [...teammates];
    newTeammates[index] = { ...newTeammates[index], [field]: value };
    setTeammates(newTeammates);
  };

  const handleTeamTypeChange = (type: 'Duo' | 'Squad' | '') => {
    setTeamType(type);
    if (type === 'Duo') {
        setTeammates(Array(1).fill({ inGameName: '', inGameUid: '' }));
    } else if (type === 'Squad') {
        setTeammates(Array(3).fill({ inGameName: '', inGameUid: '' }));
    } else {
        setTeammates([]);
    }
  };
  
  const handleNullButtonClick = () => {
    const nullValue = '\\\\\\\\\\\\';
    setTeamName(nullValue);
    setTeamType('Squad'); // Set a default type, e.g., Squad
    setTeammates(Array(3).fill({ inGameName: nullValue, inGameUid: nullValue }));
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

    if (!teamType) {
      toast({
        title: "Team Required",
        description: "Please select a team type (Duo or Squad) and fill in your teammate details.",
        variant: "destructive",
      });
      return;
    }
    
    const areTeammatesValid = teammates.every(tm => tm.inGameName.trim() !== '' && tm.inGameUid.trim() !== '');
    if (!areTeammatesValid) {
         toast({
            title: "Incomplete Team",
            description: `Please fill out all In-Game Names and UIDs for your ${teamType} members.`,
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

        const teamData = {
            name: teamName,
            type: teamType || 'Duo',
            members: teammates
        };

        await setDoc(userDocRef, {
          inGameName: inGameName,
          inGameUid: inGameUid,
          phone: `+91${phone}`,
          email: `${phone}@fireleagues.com`,
          wallet: {
            deposit: 0,
            winning: 0,
            bonus: 0,
          },
          team: teamData,
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
  
  const teammateFieldsCount = teamType === 'Duo' ? 1 : teamType === 'Squad' ? 3 : 0;

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
              <Label htmlFor="in-game-name">In-Game Name</Label>
              <Input id="in-game-name" placeholder="ProGamer" required value={inGameName} onChange={(e) => setInGameName(e.target.value)} disabled={otpSent}/>
            </div>
             <div className="grid gap-2">
                <Label htmlFor="in-game-uid">In-Game UID</Label>
                <Input id="in-game-uid" placeholder="e.g. 1234567890" required value={inGameUid} onChange={(e) => setInGameUid(e.target.value)} disabled={otpSent}/>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
               <div className="flex items-center">
                    <span className="h-10 flex items-center justify-center rounded-l-md border border-r-0 border-input bg-background px-3 text-muted-foreground text-sm">+91</span>
                    <Input id="phone" type="tel" placeholder="0000000000" required value={phone} onChange={(e) => setPhone(e.target.value)} disabled={otpSent} className="rounded-l-none"/>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
                 <h3 className="text-lg font-semibold">Register Your Team</h3>
                 <div className="grid gap-2">
                    <Label htmlFor="team-name">Team Name</Label>
                    <Input id="team-name" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. The Champions" disabled={otpSent} required/>
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="team-type">Team Type</Label>
                     <Select value={teamType} onValueChange={(value: 'Duo' | 'Squad' | '') => handleTeamTypeChange(value)} disabled={otpSent} required>
                       <SelectTrigger id="team-type"><SelectValue placeholder="Select team type..." /></SelectTrigger>
                       <SelectContent>
                           <SelectItem value="Duo">Duo</SelectItem>
                           <SelectItem value="Squad">Squad</SelectItem>
                       </SelectContent>
                    </Select>
                </div>
                {Array.from({ length: teammateFieldsCount }).map((_, index) => (
                   <div key={index} className="p-3 border rounded-md space-y-2 bg-secondary/30">
                       <Label>Teammate {index + 1}</Label>
                       <Input 
                            placeholder="In-Game Name" 
                            value={teammates[index]?.inGameName || ''} 
                            onChange={(e) => handleMemberChange(index, 'inGameName', e.target.value)} 
                            required
                            disabled={otpSent}
                        />
                       <Input 
                            placeholder="In-Game UID" 
                            value={teammates[index]?.inGameUid || ''} 
                            onChange={(e) => handleMemberChange(index, 'inGameUid', e.target.value)} 
                            required
                            disabled={otpSent}
                        />
                   </div>
                ))}
                 <p className="text-xs text-center text-muted-foreground pt-2">
                    if you don't have team members, then click on the null button down below. you can add team members later in your user profile
                 </p>
                 <Button variant="outline" onClick={handleNullButtonClick} disabled={otpSent}>
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
