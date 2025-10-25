
'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: Error) => {
      console.error('Centralized Error Handler:', error);

      if (error instanceof FirestorePermissionError) {
        toast({
          variant: 'destructive',
          title: 'Permission Denied',
          description: error.message,
          duration: 10000,
        });
        // This will now throw the error in the development environment
        // to be caught by Next.js's development overlay.
        throw error;
      } else {
        // Handle other types of errors if necessary
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null; // This component does not render anything
}
