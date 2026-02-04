
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const SliderManager = ({
  title,
  description,
  imageUrls,
  onUrlsChange,
  onUpload,
  uploading,
  sliders,
  onDelete,
  loading,
  authLoading,
}: {
  title: string;
  description: string;
  imageUrls: string;
  onUrlsChange: (value: string) => void;
  onUpload: () => void;
  uploading: boolean;
  sliders: Slider[];
  onDelete: (slider: Slider) => void;
  loading: boolean;
  authLoading: boolean;
}) => {
  return (
    <div className="space-y-6">
      <CardHeader className="p-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-lg bg-background">
        <div className="relative flex-grow w-full">
          <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Textarea
            placeholder="Enter one image URL per line..."
            value={imageUrls}
            onChange={e => onUrlsChange(e.target.value)}
            className="w-full pl-9"
            rows={3}
            disabled={authLoading || uploading}
          />
        </div>
        <Button
          onClick={onUpload}
          disabled={uploading || !imageUrls || authLoading}
          className="w-full sm:w-auto self-end"
        >
          <UploadCloud className="mr-2 h-4 w-4" />
          {uploading ? 'Adding...' : 'Add Sliders'}
        </Button>
      </div>

      {uploading && <Progress value={50} className="h-1" />}

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Current Sliders</h3>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[12/5] w-full rounded-lg" />
            ))}
          </div>
        ) : sliders.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                        <AlertDialogDescription>This action cannot be undone and will permanently delete the slider.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(slider)}
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
            <p className="text-sm text-muted-foreground">No sliders uploaded for this section yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};


export default function SliderAdmin() {
  const [homeImageUrls, setHomeImageUrls] = useState('');
  const [landingImageUrls, setLandingImageUrls] = useState('');
  
  const [homeSliders, setHomeSliders] = useState<Slider[]>([]);
  const [landingSliders, setLandingSliders] = useState<Slider[]>([]);

  const [loading, setLoading] = useState(true);
  const [uploadingHome, setUploadingHome] = useState(false);
  const [uploadingLanding, setUploadingLanding] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    const qHome = query(collection(db, 'homeSliders'), orderBy('createdAt', 'desc'));
    const unsubscribeHome = onSnapshot(qHome, snapshot => {
      const sliderData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Slider[];
      setHomeSliders(sliderData);
      setLoading(false);
    }, error => {
      console.error('Error fetching home sliders: ', error);
      toast({ title: 'Error', description: 'Could not fetch home sliders.', variant: 'destructive' });
      setLoading(false);
    });

    const qLanding = query(collection(db, 'landingSliders'), orderBy('createdAt', 'desc'));
    const unsubscribeLanding = onSnapshot(qLanding, snapshot => {
      const sliderData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Slider[];
      setLandingSliders(sliderData);
    }, error => {
      console.error('Error fetching landing sliders: ', error);
      toast({ title: 'Error', description: 'Could not fetch landing sliders.', variant: 'destructive' });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeHome();
      unsubscribeLanding();
    };
  }, [toast]);

  const handleUpload = async (collectionName: 'homeSliders' | 'landingSliders') => {
    const isHome = collectionName === 'homeSliders';
    const urls = (isHome ? homeImageUrls : landingImageUrls).split('\n').map(url => url.trim()).filter(url => url);
    if (urls.length === 0) {
      toast({ title: 'No URLs provided', description: 'Please enter at least one URL.', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in and an admin.', variant: 'destructive' });
      return;
    }

    isHome ? setUploadingHome(true) : setUploadingLanding(true);
    try {
      const idToken = await user.getIdToken(true);
      const results = await Promise.all(urls.map(url => addSliderByUrl(url, collectionName, idToken)));
      
      const successfulUploads = results.filter(r => r.success).length;
      const failedUploads = results.length - successfulUploads;

      if (successfulUploads > 0) {
        toast({ title: 'Success!', description: `${successfulUploads} slider(s) added successfully.` });
        isHome ? setHomeImageUrls('') : setLandingImageUrls('');
      }

      if (failedUploads > 0) {
        const errorMessages = results.filter(r => !r.success).map(r => r.message).join(', ');
        toast({ title: `${failedUploads} Upload(s) Failed`, description: `Errors: ${errorMessages}`, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message || 'An unknown error occurred.', variant: 'destructive' });
    } finally {
      isHome ? setUploadingHome(false) : setUploadingLanding(false);
    }
  };

  const handleDelete = async (slider: Slider, collectionName: 'homeSliders' | 'landingSliders') => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in and an admin.', variant: 'destructive' });
      return;
    }

    try {
      const idToken = await user.getIdToken(true);
      const result = await deleteSlider(slider.id, slider.storagePath ?? null, collectionName, idToken);
      if (result.success) {
        toast({ title: 'Success', description: 'Slider deleted successfully' });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error(`Error deleting slider from ${collectionName}:`, error);
      toast({ title: 'Error', description: error.message || 'Failed to delete slider.', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Homepage Sliders</CardTitle>
        <CardDescription>
          Control the promotional carousels for both logged-in users and public visitors.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="home" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="home">For Logged-In Users</TabsTrigger>
            <TabsTrigger value="landing">For Landing Page</TabsTrigger>
          </TabsList>
          <TabsContent value="home" className="mt-6">
            <SliderManager
              title="Logged-In Home Sliders"
              description="These images appear on the homepage for signed-in users."
              imageUrls={homeImageUrls}
              onUrlsChange={setHomeImageUrls}
              onUpload={() => handleUpload('homeSliders')}
              uploading={uploadingHome}
              sliders={homeSliders}
              onDelete={(slider) => handleDelete(slider, 'homeSliders')}
              loading={loading}
              authLoading={authLoading}
            />
          </TabsContent>
          <TabsContent value="landing" className="mt-6">
            <SliderManager
              title="Landing Page Sliders"
              description="These images appear on the homepage for public visitors (not logged in)."
              imageUrls={landingImageUrls}
              onUrlsChange={setLandingImageUrls}
              onUpload={() => handleUpload('landingSliders')}
              uploading={uploadingLanding}
              sliders={landingSliders}
              onDelete={(slider) => handleDelete(slider, 'landingSliders')}
              loading={loading}
              authLoading={authLoading}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
