'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoading } from "@/context/LoadingContext";
import { useEffect } from "react";
import { Mail, Phone, Headset, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ContactPage() {
  const { hideLoader } = useLoading();

  useEffect(() => {
    hideLoader();
  }, [hideLoader]);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl space-y-8">
      <header className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Have questions or need assistance? We're here to help you get back to the game.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="p-3 bg-primary text-primary-foreground rounded-xl w-fit mb-2">
              <Headset className="h-6 w-6" />
            </div>
            <CardTitle>Technical Support</CardTitle>
            <CardDescription>Fastest resolution for tournament or wallet issues.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you are a registered player, our live support team is available to assist you with real-time chat and ticket tracking.
            </p>
            <Button asChild className="w-full font-bold">
              <Link href="/support">
                Open Support Center
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-3 bg-secondary text-primary rounded-xl w-fit mb-2">
              <Mail className="h-6 w-6" />
            </div>
            <CardTitle>General Inquiries</CardTitle>
            <CardDescription>For business, media, or other questions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Email</p>
                  <p className="text-sm font-semibold">support@fireleagues.com</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">WhatsApp</p>
                  <p className="text-sm font-semibold">+91 98765 43210</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>Check our help documentation for quick answers.</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
          <div>
            <h4 className="font-bold mb-1">How long do withdrawals take?</h4>
            <p className="text-muted-foreground">Withdrawal requests are typically processed within 24-48 business hours after approval.</p>
          </div>
          <div>
            <h4 className="font-bold mb-1">Is my payment secure?</h4>
            <p className="text-muted-foreground">Yes, all financial transactions are verified manually by our admin team using official UTR references.</p>
          </div>
          <div>
            <h4 className="font-bold mb-1">Can I change my username?</h4>
            <p className="text-muted-foreground">Usernames are unique identifiers and cannot be changed once the account is created.</p>
          </div>
          <div>
            <h4 className="font-bold mb-1">What if I encounter a hacker?</h4>
            <p className="text-muted-foreground">Please provide screen recording proof via our support ticket system for immediate action.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
