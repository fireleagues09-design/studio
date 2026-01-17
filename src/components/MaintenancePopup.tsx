'use client';

import { HardHat } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function MaintenancePopup() {
  return (
    <Dialog open={true}>
      <DialogContent 
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        hideCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-2xl text-primary">
            <HardHat className="h-6 w-6"/>
            Site Maintenance
          </DialogTitle>
        </DialogHeader>
        <div className="pt-2 text-base space-y-3 text-center">
            <p className="text-muted-foreground">
              We're making some important updates to improve your experience.
            </p>
            <p className="font-semibold text-lg text-foreground px-4 py-3 bg-secondary rounded-md">
              "There is an maintenance going on so please wait... And website will get back soon"
            </p>
            <p className="text-sm text-muted-foreground pt-2">
              Thank you for your patience! We'll be back online shortly.
            </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
