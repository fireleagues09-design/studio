import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Terms and Conditions</CardTitle>
          <p className="text-muted-foreground">Last updated: July 29, 2024</p>
        </CardHeader>
        <CardContent className="prose prose-invert max-w-none">
          <p>
            Welcome to FireLeagues! These terms and conditions outline the rules
            and regulations for the use of FireLeagues's Website, located at
            fireleagues.com.
          </p>

          <p>
            By accessing this website we assume you accept these terms and
            conditions. Do not continue to use FireLeagues if you do not agree
            to take all of the terms and conditions stated on this page.
          </p>

          <h2>1. Eligibility</h2>
          <p>
            Participants must meet the age requirements specified for each
            tournament. By registering, you confirm that you are eligible to
            participate.
          </p>

          <h2>2. Account Registration</h2>
          <p>
            To participate in tournaments, you must create an account and
            provide accurate and complete information. You are responsible for
            maintaining the confidentiality of your account and password.
          </p>

          <h2>3. Code of Conduct</h2>
          <p>
            All participants are expected to exhibit good sportsmanship. Any
            form of cheating, harassment, or toxic behavior will result in
            immediate disqualification and potential suspension from the
            platform.
          </p>

          <h2>4. Tournament Rules</h2>
          <p>
            Each tournament has its specific set of rules. It is the
            participant's responsibility to read, understand, and adhere to
            these rules. Failure to do so may result in penalties or
            disqualification.
          </p>

          <h2>5. Limitation of Liability</h2>
          <p>
            FireLeagues is not responsible for any technical issues, network
            problems, or other unforeseen circumstances that may affect your
            participation in a tournament.
          </p>

          <h2>6. Changes to Terms</h2>
          <p>
            We reserve the right to revise these terms and conditions at any
            time. By using this Website, you are expected to review these terms
            on a regular basis.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
