
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { applyActionCode, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useLoading } from "@/context/LoadingContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MailCheck, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("Invalid or expired verification link.");
  const { hideLoader } = useLoading();
  const router = useRouter();

  useEffect(() => {
    hideLoader();
    const oobCode = searchParams.get("oobCode");

    if (!oobCode) {
      setStatus("error");
      return;
    }

    applyActionCode(auth, oobCode)
      .then(() => {
        setStatus("success");
        // After successful verification, redirect user to their profile page after a short delay
        // This also handles re-authenticating the user if they were logged out.
        onAuthStateChanged(auth, (user) => {
            if (user) {
                 setTimeout(() => router.push('/profile'), 2000);
            } else {
                 setTimeout(() => router.push('/login'), 2000);
            }
        });
      })
      .catch((error) => {
        setStatus("error");
        if (error.code === 'auth/invalid-action-code') {
            setErrorMessage("This verification link is invalid, expired, or has already been used.");
        }
        console.error("Verification error:", error);
      });
  }, [searchParams, router, hideLoader]);
  
  const renderContent = () => {
    switch (status) {
        case "verifying":
            return (
                <>
                    <Loader2 className="h-16 w-16 text-primary mb-4 animate-spin" />
                    <CardTitle className="text-2xl">Verifying Email</CardTitle>
                    <CardDescription>
                        Please wait a moment while we verify your email address.
                    </CardDescription>
                </>
            );
        case "success":
             return (
                <>
                    <MailCheck className="h-16 w-16 text-green-500 mb-4" />
                    <CardTitle className="text-2xl">Email Verified!</CardTitle>
                    <CardDescription>
                        Your email has been successfully verified. Redirecting you now...
                    </CardDescription>
                </>
            );
        case "error":
             return (
                <>
                    <XCircle className="h-16 w-16 text-destructive mb-4" />
                    <CardTitle className="text-2xl">Verification Failed</CardTitle>
                    <CardDescription>
                        {errorMessage}
                    </CardDescription>
                </>
            );
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-background text-foreground py-12 px-4">
      <Card className="w-full max-w-md mx-auto bg-card border-border shadow-lg text-center">
        <CardHeader className="items-center">
            {renderContent()}
        </CardHeader>
        {status !== 'verifying' && (
            <CardContent className="flex justify-center">
                <Button asChild>
                    <Link href="/login">
                    Go to Login
                    </Link>
                </Button>
            </CardContent>
        )}
      </Card>
    </div>
  );
}

    