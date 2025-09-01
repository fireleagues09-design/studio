
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
import { ref, deleteObject } from 'firebase/storage';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { useToast } from '@/hooks/use-toast';
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
import { getSignedUploadUrl } from '@/app/admin/actions';

type Slider = {
  id: string;
  url: string;
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
        toast({
          title: 'Error',
          description: 'Could not fetch sliders. Check permissions.',
          variant: 'destructive',
        });
        setLoading(false);
      }
    );
    return () => unsub();
  }, [toast]);

  async function handleUpload() {
    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please select a file to upload.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // 1. Get signed URL from server action
      const { success, uploadUrl, publicUrl, error } = await getSignedUploadUrl(
        file.name,
        file.type
      );

      if (!success || !uploadUrl || !publicUrl) {
        throw new Error(error || 'Failed to get upload URL.');
      }

      // 2. Upload file to Firebase Storage using the signed URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('File upload failed.');
      }
      
      // 3. Save public URL to Firestore
      await addDoc(collection(db, 'sliders'), {
        url: publicUrl,
        createdAt: serverTimestamp(),
      });

      setFile(null);
      const fileInput = document.getElementById(
        'slider-file-input'
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      toast({
        title: 'Success',
        description: 'Slider image uploaded successfully!',
      });
    } catch (err: any) {
      console.error('Upload failed:', err);
      toast({
        title: 'Upload Failed',
        description:
          err.message || 'Could not upload image. Check permissions or console for details.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(slider: Slider) {
    try {
      // Delete from Storage
      const imageRef = ref(storage, slider.url);
      await deleteObject(imageRef);

      // Delete from Firestore
      await deleteDoc(doc(db, 'sliders', slider.id));

      toast({ title: 'Success', description: 'Slider image deleted.' });
    } catch (error: any) {
       console.error('Error deleting slider:', error);
       // Handle cases where the file might not exist in storage anymore
      if (error.code === 'storage/object-not-found') {
          await deleteDoc(doc(db, 'sliders', slider.id));
           toast({ title: 'Success', description: 'Slider record deleted (image was not found in storage).' });
      } else {
        toast({
            title: 'Error',
            description:
            'Failed to delete slider. Check permissions or console for details.',
            variant: 'destructive',
        });
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Sliders</CardTitle>
        <CardDescription>
          Upload new images for the homepage slider gallery. Click an image to
          delete it.
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
