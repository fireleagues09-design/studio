
'use client';

import { Ban, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type SuspendedUserPopupProps = {
  onLogout: () => void;
  note?: string;
};

export function SuspendedUserPopup({ onLogout, note }: SuspendedUserPopupProps) {
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
          <DialogDescription className="pt-4 text-base space-y-4">
            <p>Your account has been suspended.</p>
            
            {note ? (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-xs uppercase font-bold text-destructive mb-1">Reason for suspension:</p>
                    <p className="text-foreground italic">"{note}"</p>
                </div>
            ) : (
                <p>your account have been suspended. please contact our customer support for more info. thank you</p>
            )}
            
            <p className="text-sm text-muted-foreground">Please contact our customer support for more info. Thank you.</p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end pt-4 gap-2">
          <Button variant="outline" disabled>Cancel</Button>
          <Button variant="destructive" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
