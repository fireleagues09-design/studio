'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoading } from "@/context/LoadingContext";
import { useEffect } from "react";

export default function PrivacyPage() {
  const { hideLoader } = useLoading();

  useEffect(() => {
    hideLoader();
  }, [hideLoader]);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          <p className="text-muted-foreground">Last updated: July 29, 2024</p>
        </CardHeader>
        <CardContent className="prose prose-invert max-w-none">
          <p>
            FireLeagues ("us", "we", or "our") operates the fireleagues.in
            website (the "Service"). This page informs you of our policies
            regarding the collection, use, and disclosure of personal data when
            you use our Service and the choices you have associated with that
            data.
          </p>

          <h2>1. Information Collection and Use</h2>
          <p>
            We collect several different types of information for various
            purposes to provide and improve our Service to you. This includes
            your in-game name, email address, and phone number.
          </p>

          <h2>2. Use of Data</h2>
          <p>FireLeagues uses the collected data for various purposes:</p>
          <ul>
            <li>To provide and maintain the Service</li>
            <li>To notify you about changes to our Service</li>
            <li>
              To allow you to participate in interactive features of our
              Service when you choose to do so
            </li>
            <li>To provide customer care and support</li>
            <li>To monitor the usage of the Service</li>
            <li>To detect, prevent and address technical issues</li>
          </ul>

          <h2>3. Data Security</h2>
          <p>
            The security of your data is important to us, but remember that no
            method of transmission over the Internet, or method of electronic
            storage is 100% secure. While we strive to use commercially
            acceptable means to protect your Personal Data, we cannot guarantee
            its absolute security.
          </p>

          <h2>4. AI-Powered Recommendations</h2>
            <p>
                We use your tournament history and performance data to power our AI recommendation engine. 
                This helps us suggest tournaments that you are most likely to enjoy and perform well in. 
                This data is processed internally and is not shared with third parties for marketing purposes.
            </p>

          <h2>5. Changes to This Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify
            you of any changes by posting the new Privacy Policy on this page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
