
'use client';

import { useState, useEffect } from 'react';
import { db, auth, storage } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { UploadCloud, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from './ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Progress } from './ui/progress';
import { onAuthStateChanged, User } from 'firebase/auth';

type Slider = {
  id: string;
  url: string;
  storagePath: string;
};

export default function SliderAdmin() {
  const [file, setFile] = useState<File | null>(null);
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'sliders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      snapshot => {
        const sliderData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Slider[];
        setSliders(sliderData);
        setLoading(false);
      },
      error => {
        console.error('Error fetching sliders: ', error);
        toast({ title: 'Error', description: 'Could not fetch sliders.', variant: 'destructive'});
        setLoading(false);
      }
    );
    return () => unsub();
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
            toast({
                title: 'File too large',
                description: 'Please select a file smaller than 5MB.',
                variant: 'destructive',
            });
            setFile(null);
            e.target.value = ''; // Reset file input
            return;
        }
        setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) {
      toast({ title: 'Error', description: 'No file selected or you are not logged in.', variant: 'destructive' });
      return;
    }

    setUploading(true);

    try {
        // Step 1: Verify user is admin on the client side before any upload attempt
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists() || userDoc.data()?.isAdmin !== true) {
            throw new Error("Permission denied: User is not an admin.");
        }

        // Step 2: Upload to Firebase Storage
        const storagePath = `sliders/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);

        // Step 3: Get download URL
        const url = await getDownloadURL(storageRef);
        
        // Step 4: Save to Firestore
        await addDoc(collection(db, 'sliders'), {
            url: url,
            storagePath: storagePath,
            createdAt: serverTimestamp(),
        });

        toast({ title: 'Success', description: "Slider uploaded successfully!" });
        setFile(null);
        const fileInput = document.getElementById('slider-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

    } catch (err: any) {
        console.error('Upload process failed:', err);
        toast({ 
            title: 'Upload Failed', 
            description: err.message || 'An unknown error occurred.', 
            variant: 'destructive' 
        });
    } finally {
        setUploading(false);
    }
  };

  const handleDelete = async (slider: Slider) => {
    if (!user) {
        toast({ title: 'Error', description: 'You must be logged in to delete sliders.', variant: 'destructive' });
        return;
    }
    try {
        const storageRef = ref(storage, slider.storagePath);
        await deleteObject(storageRef);
        await deleteDoc(doc(db, 'sliders', slider.id));
        toast({ title: 'Success', description: 'Slider deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting slider:', error);
        toast({ title: 'Error', description: error.message || 'Failed to delete slider.', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Sliders</CardTitle>
        <CardDescription>
          Upload new images for the homepage slider gallery. Recommended size: 1200x500px, max 5MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Input
            id="slider-file-input"
            type="file"
            accept="image/png, image/jpeg, image/gif, image/webp"
            onChange={handleFileChange}
            className="w-full sm:w-auto flex-grow"
            disabled={uploading || authLoading}
          />
          <Button
            onClick={handleUpload}
            disabled={uploading || !file || authLoading}
            className="w-full sm:w-auto"
          >
            {authLoading ? 'Authenticating...' : uploading ? (
              'Uploading...'
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" /> Upload Slider
              </>
            )}
          </Button>
        </div>
        
        {uploading && (
             <div className="space-y-2">
                <Progress value={undefined} className="[&>div]:animate-pulse" />
                <p className="text-sm text-muted-foreground text-center">Uploading and processing...</p>
            </div>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Current Sliders
          </h3>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video w-full rounded-lg" />
              ))}
            </div>
          ) : sliders.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sliders.map(slider => (
                <div key={slider.id} className="relative group">
                  <Image
                    src={slider.url}
                    alt="Uploaded slider"
                    width={200}
                    height={120}
                    className="aspect-video w-full rounded-lg object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" disabled={authLoading}>
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the slider image and its database record.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(slider)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No sliders uploaded yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
