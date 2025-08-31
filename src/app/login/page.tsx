"use client";

import Link from "next/link";
import { useState } from "react";
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

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSendOtp = async () => {
    if (!phone) {
        toast({ title: "Error", description: "Please enter a phone number.", variant: "destructive" });
        return;
    }
    setLoading(true);
    // Mock OTP sending
    setTimeout(() => {
      setOtpSent(true);
      toast({ title: "Success", description: "OTP sent to your phone! (Test Mode)" });
      setLoading(false);
    }, 1000);
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
        toast({ title: "Error", description: "Please enter the OTP.", variant: "destructive" });
        return;
    }
    setLoading(true);
    // Mock OTP verification
     setTimeout(() => {
        toast({ title: "Success", description: "Logged in successfully!" });
        router.push("/");
        setLoading(false);
    }, 1000);
  };


  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-12">
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
