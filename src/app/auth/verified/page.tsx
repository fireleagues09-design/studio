
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLoading } from '@/context/LoadingContext';
import { MailCheck } from 'lucide-react';

export default function VerifiedPage() {
  const { hideLoader } = useLoading();

  useEffect(() => {
    hideLoader();
  }, [hideLoader]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-background text-foreground py-12 px-4">
      <Card className="w-full max-w-md mx-auto bg-card border-border shadow-lg text-center">
        <CardHeader className="items-center">
          <MailCheck className="h-16 w-16 text-green-500 mb-4" />
          <CardTitle className="text-2xl">Email Verified!</CardTitle>
          <CardDescription>
            Your email address has been successfully verified.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You can now log in to your account and access all features.
          </p>
        </CardContent>
        <CardContent className="flex justify-center">
           <Button asChild>
            <Link href="/login">
              Proceed to Login
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
