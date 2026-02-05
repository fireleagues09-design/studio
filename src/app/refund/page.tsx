
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoading } from "@/context/LoadingContext";
import { useEffect } from "react";

export default function RefundPage() {
  const { hideLoader } = useLoading();

  useEffect(() => {
    hideLoader();
  }, [hideLoader]);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Refund Policy</CardTitle>
          <p className="text-muted-foreground">Last updated: July 29, 2024</p>
        </CardHeader>
        <CardContent className="prose prose-invert max-w-none">
          <p>
            This policy outlines the terms for refunds of tournament entry
            fees on FireLeagues.
          </p>

          <h2>1. General Policy</h2>
          <p>
            All entry fees are non-refundable except under specific
            circumstances outlined below. We encourage you to be certain of
            your participation before registering.
          </p>

          <h2>2. Tournament Cancellation</h2>
          <p>
            If a tournament is canceled by FireLeagues for any reason, all
            registered participants will receive a full refund of their entry
            fee. Refunds will be processed to the original method of payment
            within 5-7 business days.
          </p>

          <h2>3. Disqualification</h2>
          <p>
            No refunds will be issued to players who are disqualified for
            violating the Code of Conduct, cheating, or failing to adhere to
            tournament rules.
          </p>

          <h2>4. Withdrawal from a Tournament</h2>
          <p>
            If you wish to withdraw from a tournament, you may be eligible for
            a refund if you request it at least 48 hours before the scheduled
            start time of the tournament. Refund requests made within 48 hours
            of the start time will not be honored.
          </p>

          <h2>5. How to Request a Refund</h2>
          <p>
            To request a refund, please contact our support team through the
            contact form on our website, providing your username and the name
            of the tournament.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
