
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { UploadCloud, Trash2, XCircle } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Progress } from './ui/progress';
import { uploadSlider, deleteSlider } from '@/app/admin/actions';

type Slider = {
  id: string;
  url: string;
  storagePath: string;
  createdAt: any;
};

export default function SliderAdmin() {
  const [file, setFile] = useState<File | null>(null);
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select a file smaller than 5MB.',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const resetFileInput = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file) {
        toast({ title: 'No file selected', variant: 'destructive' });
        return;
    }
    if (!user) {
        toast({ title: 'Authentication Error', description: 'You must be logged in.', variant: 'destructive' });
        return;
    }

    setUploading(true);
    setUploadProgress(5); // Initial progress

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const idToken = await user.getIdToken();
        
        try {
            setUploadProgress(50);
            const result = await uploadSlider(base64Data, file.type, file.name, idToken);
            setUploadProgress(100);

            if (result.success) {
                toast({ title: 'Success!', description: 'Slider uploaded successfully.' });
                resetFileInput();
            } else {
                throw new Error(result.message);
            }
        } catch (err: any) {
            console.error('Upload process failed:', err);
            toast({ title: 'Upload Failed', description: err.message || 'An unknown error occurred.', variant: 'destructive' });
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };
    reader.onerror = () => {
        toast({ title: 'File Read Error', description: 'Could not read the selected file.', variant: 'destructive' });
        setUploading(false);
    };
};


  const handleDelete = async (slider: Slider) => {
    if (!user) {
        toast({ title: 'Authentication Error', description: 'You must be logged in.', variant: 'destructive' });
        return;
    }
    const idToken = await user.getIdToken();
    try {
      const result = await deleteSlider(slider.id, slider.storagePath, idToken);
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
          Upload new images for the homepage carousel. Recommended size: 1200x500px, max 5MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-lg">
          <Input
            id="slider-file-input"
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/gif, image/webp"
            onChange={handleFileChange}
            className="w-full sm:w-auto flex-grow file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            disabled={authLoading || uploading}
          />
           {file && !uploading && (
             <Button variant="ghost" size="icon" onClick={resetFileInput}>
                <XCircle className="h-5 w-5 text-muted-foreground"/>
             </Button>
           )}
          <Button
            onClick={handleUpload}
            disabled={uploading || !file || authLoading}
            className="w-full sm:w-auto"
          >
             <UploadCloud className="mr-2 h-4 w-4" />
             {uploading ? `Uploading...` : 'Upload'}
          </Button>
        </div>
        
        {authLoading && ( <p className="text-sm text-muted-foreground text-center">Verifying permissions...</p>)}
        
        {uploading && (
             <Progress value={uploadProgress} />
        )}

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
                    height={125}
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
