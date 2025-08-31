
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
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";


// Add a global declaration for the confirmationResult
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

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
    if (!phone) {
        toast({ title: "Error", description: "Please enter a phone number.", variant: "destructive" });
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

  const handleVerifyOtp = async () => {
    if (!otp) {
        toast({ title: "Error", description: "Please enter the OTP.", variant: "destructive" });
        return;
    }
    setLoading(true);
    try {
        if (window.confirmationResult) {
          const userCredential = await window.confirmationResult.confirm(otp);
          const user = userCredential.user;

          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            // User is not registered, sign them out and redirect
            await auth.signOut();
            toast({
                title: "Login Failed",
                description: "User not registered. Please sign up first.",
                variant: "destructive"
            });
            router.push('/register');
            return;
          }

          toast({ title: "Success", description: "Logged in successfully!" });
          router.push("/");
        } else {
            throw new Error("OTP not sent yet or session expired.");
        }
      } catch (error: any) {
        console.error("Error verifying OTP:", error);
        // Clear confirmation result on failure to prevent unintended session state
        window.confirmationResult = undefined;
        toast({ title: "Verification Error", description: error.message || "Invalid OTP or user not registered. Please try again.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
  };


  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-12">
      <div id="recaptcha-container"></div>
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            {otpSent ? "Enter the OTP we sent to your phone." : "Enter your phone number to receive an OTP."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {!otpSent ? (
             <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex items-center">
                    <span className="h-10 flex items-center justify-center rounded-l-md border border-r-0 border-input bg-background px-3 text-muted-foreground text-sm">+91</span>
                    <Input id="phone" type="tel" placeholder="00000 00000" required value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-l-none" />
                </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="otp">One-Time Password (OTP)</Label>
              <Input id="otp" type="text" placeholder="123456" required value={otp} onChange={(e) => setOtp(e.target.value)} />
            </div>
          )}
          
          <Button onClick={otpSent ? handleVerifyOtp : handleSendOtp} className="w-full" disabled={loading}>
            {loading ? 'Processing...' : (otpSent ? 'Verify OTP' : 'Send OTP')}
          </Button>

          {otpSent && (
             <Button variant="link" size="sm" onClick={() => setOtpSent(false)} disabled={loading}>
                Change phone number
            </Button>
          )}

          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
