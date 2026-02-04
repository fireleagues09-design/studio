
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { UploadCloud, Trash2, Link as LinkIcon } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Progress } from './ui/progress';
import { addSliderByUrl, deleteSlider } from '@/app/admin/actions';

type Slider = {
  id: string;
  url: string;
  storagePath?: string;
  createdAt: any;
};

export default function SliderAdmin() {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    const q = query(collection(db, 'sliders'), orderBy('createdAt', 'desc'));
    const unsubscribeSliders = onSnapshot(
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
        toast({ title: 'Error', description: 'Could not fetch sliders.', variant: 'destructive' });
        setLoading(false);
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeSliders();
    };
  }, [toast]);

  const handleUpload = async () => {
    if (!imageUrl) {
      toast({ title: 'No image URL provided', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in and an admin.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const idToken = await user.getIdToken(true);
      const result = await addSliderByUrl(imageUrl, idToken);

      if (result.success) {
        toast({ title: 'Success!', description: 'Slider added successfully.' });
        setImageUrl('');
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      console.error('Upload process failed:', err);
      toast({ title: 'Upload Failed', description: err.message || 'An unknown error occurred.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (slider: Slider) => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in and an admin.', variant: 'destructive' });
      return;
    }

    try {
      const idToken = await user.getIdToken(true);
      const result = await deleteSlider(slider.id, slider.storagePath as string, idToken);
      if (result.success) {
        toast({ title: 'Success', description: 'Slider deleted successfully' });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error deleting slider:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete slider.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Sliders</CardTitle>
        <CardDescription>
          Add new images for the homepage carousel by providing an image URL.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-lg">
          <div className="relative flex-grow w-full">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="slider-url-input"
              type="url"
              placeholder="https://example.com/image.png"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              className="w-full pl-9"
              disabled={authLoading || uploading}
            />
          </div>
          <Button
            onClick={handleUpload}
            disabled={uploading || !imageUrl || authLoading}
            className="w-full sm:w-auto"
          >
            <UploadCloud className="mr-2 h-4 w-4" />
            {uploading ? `Adding...` : 'Add Slider'}
          </Button>
        </div>

        {authLoading && <p className="text-sm text-muted-foreground text-center">Verifying permissions...</p>}

        {uploading && <Progress value={50} className="h-1" />}

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Current Sliders
          </h3>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[12/5] w-full rounded-lg" />
              ))}
            </div>
          ) : sliders.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sliders.map(slider => (
                <div key={slider.id} className="relative group">
                  <Image
                    src={slider.url}
                    alt="Uploaded slider"
                    width={250}
                    height={105}
                    className="aspect-[12/5] w-full rounded-lg object-cover border"
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
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
                            delete the slider image record.
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
            <div className="text-center py-8 bg-secondary rounded-lg">
              <p className="text-sm text-muted-foreground">
                No sliders uploaded yet.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
