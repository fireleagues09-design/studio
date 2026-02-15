
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { applyActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useLoading } from "@/context/LoadingContext";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MailCheck, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("Invalid or expired verification link.");
  const { hideLoader } = useLoading();

  useEffect(() => {
    hideLoader();
    const oobCode = searchParams.get("oobCode");

    if (!oobCode) {
      setStatus("error");
      setErrorMessage("No verification code provided. The link may be incomplete.");
      return;
    }

    applyActionCode(auth, oobCode)
      .then(() => {
        setStatus("success");
      })
      .catch((error) => {
        setStatus("error");
        if (error.code === 'auth/invalid-action-code') {
            setErrorMessage("This verification link is invalid, expired, or has already been used. Please request a new one from your profile page.");
        }
        console.error("Verification error:", error);
      });
  }, [searchParams, hideLoader]);
  
  const renderContent = () => {
    switch (status) {
        case "verifying":
            return (
                <CardHeader className="items-center text-center">
                    <Loader2 className="h-16 w-16 text-primary mb-4 animate-spin" />
                    <CardTitle className="text-2xl">Verifying Email</CardTitle>
                    <CardDescription>
                        Please wait a moment while we confirm your email address.
                    </CardDescription>
                </CardHeader>
            );
        case "success":
             return (
                <>
                    <CardHeader className="items-center text-center">
                        <MailCheck className="h-16 w-16 text-green-500 mb-4" />
                        <CardTitle className="text-2xl">Email Verified!</CardTitle>
                        <CardDescription>
                            Your account is now verified. You can log in to access all features.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center">
                        <Button asChild>
                            <Link href="/login">
                                Proceed to Login
                            </Link>
                        </Button>
                    </CardFooter>
                </>
            );
        case "error":
             return (
                <>
                    <CardHeader className="items-center text-center">
                        <XCircle className="h-16 w-16 text-destructive mb-4" />
                        <CardTitle className="text-2xl">Verification Failed</CardTitle>
                        <CardDescription>
                            {errorMessage}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center">
                        <Button asChild variant="secondary">
                            <Link href="/">
                            Go to Homepage
                            </Link>
                        </Button>
                    </CardFooter>
                </>
             );
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-background text-foreground py-12 px-4">
      <Card className="w-full max-w-md mx-auto bg-card border-border shadow-lg">
        {renderContent()}
      </Card>
    </div>
  );
}
