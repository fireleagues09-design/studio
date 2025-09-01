
'use client';

import { useState, useEffect } from 'react';
import { db, storage as clientStorage } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
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
import { auth } from '@/lib/firebase';

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
        toast({ title: 'Error', description: 'Could not fetch sliders. Check permissions.', variant: 'destructive'});
        setLoading(false);
      }
    );
    return () => unsub();
  }, [toast]);

  const handleUpload = async () => {
    const user = auth.currentUser;
    if (!file) {
      toast({ title: 'No file selected', description: 'Please select a file to upload.', variant: 'destructive'});
      return;
    }
     if (!user) {
        toast({ title: 'Not Authenticated', description: 'You must be logged in to upload.', variant: 'destructive' });
        return;
    }
    
    setUploading(true);
    const fileInput = document.getElementById('slider-file-input') as HTMLInputElement;

    try {
       // 1. Check if user is an admin
       const userDocRef = doc(db, 'users', user.uid);
       const userDoc = await getDoc(userDocRef);
       if (!userDoc.exists() || !userDoc.data()?.isAdmin) {
           throw new Error('Permission Denied. You do not have permission to upload sliders.');
       }
       
       const storagePath = `sliders/${Date.now()}-${file.name}`;
       const storageRef = ref(clientStorage, storagePath);
 
       // 2. Upload file to Firebase Storage
       await uploadBytes(storageRef, file);
 
       // 3. Get the public URL
       const publicUrl = await getDownloadURL(storageRef);
 
       // 4. Save metadata to Firestore
       await addDoc(collection(db, 'sliders'), {
           url: publicUrl,
           storagePath: storagePath,
           createdAt: serverTimestamp(),
       });
 
       toast({ title: 'Success', description: "Slider uploaded successfully!" });
       setFile(null);
       if (fileInput) fileInput.value = '';
 
     } catch (err: any) {
       console.error('Upload process failed:', err);
       toast({ title: 'Upload Failed', description: err.message || 'An unknown error occurred.', variant: 'destructive'});
     } finally {
       // This guarantees the loading state is turned off.
       setUploading(false);
     }
  };

  async function handleDelete(slider: Slider) {
    try {
      // Delete Firestore document first
      await deleteDoc(doc(db, 'sliders', slider.id));
      
      // Then delete file from Storage
      const imageRef = ref(clientStorage, slider.storagePath);
      await deleteObject(imageRef);

      toast({ title: 'Success', description: 'Slider image deleted.'});
    } catch (error: any) {
       console.error('Error deleting slider:', error);
       let errorMessage = 'Failed to delete slider. Check console for details.';
       if (error.code === 'storage/unauthorized' || error.code === 'permission-denied') {
          errorMessage = 'Permission denied. Please check your Firebase rules.';
       }
       toast({ title: 'Error', description: errorMessage, variant: 'destructive'});
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Sliders</CardTitle>
        <CardDescription>
          Upload new images for the homepage slider gallery.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Input
            id="slider-file-input"
            type="file"
            accept="image/*"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="w-full sm:w-auto flex-grow"
            disabled={uploading}
          />
          <Button
            onClick={handleUpload}
            disabled={uploading || !file}
            className="w-full sm:w-auto"
          >
            {uploading ? (
              'Uploading...'
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" /> Upload Slider
              </>
            )}
          </Button>
        </div>

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
                        <Button variant="destructive" size="icon">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the slider image.
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
