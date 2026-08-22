import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center gap-4">
           <div className="flex items-center space-x-2">
            <Image 
              src="https://ik.imagekit.io/rexa7788/Fire%20Leagues%20logo.png" 
              alt="FireLeagues Logo" 
              width={24} 
              height={24} 
              className="rounded-md object-contain"
            />
            <span className="font-bold text-lg">FireLeagues</span>
          </div>
          <nav className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <Link href="/contact" className="hover:text-primary">
              Contact Us
            </Link>
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
