
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/context/LoadingContext';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MailCheck } from 'lucide-react';
import Link from 'next/link';

export default function PendingVerificationPage() {
    const router = useRouter();
    const { hideLoader } = useLoading();

    useEffect(() => {
        hideLoader();
    }, [hideLoader]);

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-background text-foreground py-12 px-4">
            <Card className="w-full max-w-md mx-auto bg-card border-border shadow-lg">
                <CardHeader className="text-center items-center">
                    <MailCheck className="h-16 w-16 text-primary mb-4" />
                    <CardTitle className="text-2xl">Check Your Email</CardTitle>
                    <CardDescription>
                        We've sent a verification link to your email address. Please click the link to activate your account and complete your registration.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-sm text-muted-foreground mb-6">
                        You can close this page after verifying your email.
                    </p>
                    <Button asChild className="w-full">
                        <Link href="/login">Go to Login</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
