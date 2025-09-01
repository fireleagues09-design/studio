
'use client';

import { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
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
        alert('Could not fetch sliders. Check Firestore permissions.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  async function handleUpload() {
    if (!file) {
      alert('Please select a file to upload.');
      return;
    }

    console.log('Starting upload...');
    setUploading(true);

    const storagePath = `sliders/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, storagePath);

    try {
      // 1. Upload file
      console.log('Uploading file to Firebase Storage...');
      await uploadBytes(storageRef, file);
      console.log('File uploaded successfully.');

      // 2. Get URL
      console.log('Getting download URL...');
      const url = await getDownloadURL(storageRef);
      console.log('Got download URL:', url);

      // 3. Save to Firestore
      console.log('Saving URL to Firestore...');
      await addDoc(collection(db, 'sliders'), {
        url: url,
        storagePath: storagePath,
        createdAt: serverTimestamp(),
      });
      console.log('URL saved to Firestore.');

      alert('Slider image uploaded successfully!');
      setFile(null);
      // Reset the file input
      const fileInput = document.getElementById('slider-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err: any) {
      console.error('An error occurred during upload:', err);
      alert(`Upload failed. Check the developer console for errors. Message: ${err.message}`);
    } finally {
      console.log('Upload process finished. Resetting loading state.');
      setUploading(false);
    }
  }

  async function handleDelete(slider: Slider) {
    try {
      // Delete from Storage
      const imageRef = ref(storage, slider.storagePath);
      await deleteObject(imageRef);

      // Delete from Firestore
      await deleteDoc(doc(db, 'sliders', slider.id));

      alert('Slider image deleted.');
    } catch (error: any) {
       console.error('Error deleting slider:', error);
      if (error.code === 'storage/object-not-found') {
          // If file doesn't exist in storage, just delete the Firestore doc
          await deleteDoc(doc(db, 'sliders', slider.id));
           alert('Slider record deleted (image was not found in storage).');
      } else {
        alert('Failed to delete slider. Check permissions or console for details.');
      }
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
