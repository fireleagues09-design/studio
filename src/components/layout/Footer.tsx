
import Link from "next/link";
import { Flame } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center gap-4">
           <div className="flex items-center space-x-2">
            <Flame className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">FireLeagues</span>
          </div>
          <nav className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-primary">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-primary">
              Privacy
            </Link>
            <Link href="/refund" className="hover:text-primary">
              Refund Policy
            </Link>
          </nav>
           <p className="text-xs text-muted-foreground text-center">
            &copy; 2026 FireLeagues. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
