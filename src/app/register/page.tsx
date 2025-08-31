
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

// Add a global declaration for the confirmationResult
declare global {
    interface Window {
      recaptchaVerifier?: RecaptchaVerifier;
      confirmationResult?: ConfirmationResult;
    }
  }

export default function RegisterPage() {
  const [inGameName, setInGameName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

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
    if (!inGameName || !phone) {
      toast({ title: "Error", description: "Please fill in all fields.", variant: "destructive" });
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
        
        await setDoc(userDocRef, {
          inGameName: inGameName,
          phone: `+91${phone}`,
          email: `${phone}@fireleagues.com`,
          wallet: {
            deposit: 0,
            winning: 0,
            bonus: 0,
          },
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

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-12">
       <div id="recaptcha-container"></div>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            Create your account to join tournaments and start winning.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="in-game-name">In-Game Name</Label>
              <Input id="in-game-name" placeholder="ProGamer" required value={inGameName} onChange={(e) => setInGameName(e.target.value)} disabled={otpSent}/>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
               <div className="flex items-center">
                    <span className="h-10 flex items-center justify-center rounded-l-md border border-r-0 border-input bg-background px-3 text-muted-foreground text-sm">+91</span>
                    <Input id="phone" type="tel" placeholder="00000 00000" required value={phone} onChange={(e) => setPhone(e.target.value)} disabled={otpSent} className="rounded-l-none"/>
                </div>
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
