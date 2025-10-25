
'use client';

import { Ban, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type SuspendedUserPopupProps = {
  onLogout: () => void;
};

export function SuspendedUserPopup({ onLogout }: SuspendedUserPopupProps) {
  return (
    <Dialog open={true}>
      <DialogContent 
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        hideCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl text-destructive">
            <Ban className="h-6 w-6"/>
            Account Suspended
          </DialogTitle>
          <DialogDescription className="pt-4 text-base">
            your account have been suspended. please contact our customer support for more info. thank you
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end pt-4">
          <Button variant="destructive" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
