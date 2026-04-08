
'use client';

import { useState, useEffect, useRef } from 'react';
import { storage, auth, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Globe, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { updateBrandingSettings } from '@/app/admin/actions';
import { cn } from '@/lib/utils';

export default function BrandingAdmin() {
    const [faviconUrl, setFaviconUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'branding'), (doc) => {
            if (doc.exists()) {
                setFaviconUrl(doc.data().faviconUrl || '');
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            toast({ title: "Invalid File", description: "Please upload an image file.", variant: "destructive" });
            return;
        }

        setIsUploading(true);
        setUploadSuccess(false);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Authentication required.");

            // Standardize naming and use the requested folder path
            const extension = file.name.split('.').pop();
            const fileName = `favicon_${Date.now()}.${extension}`;
            const storageRef = ref(storage, `fav-icon/${fileName}`);
            
            console.log("Starting storage upload to fav-icon/ folder...");
            
            // Perform the upload
            const snapshot = await uploadBytes(storageRef, file);
            console.log("Uploaded successfully:", snapshot);

            // Get download URL
            const downloadUrl = await getDownloadURL(snapshot.ref);
            console.log("File URL acquired:", downloadUrl);

            // Save to Firestore using server action
            const idToken = await user.getIdToken(true);
            const result = await updateBrandingSettings({ faviconUrl: downloadUrl }, idToken);

            if (result.success) {
                setUploadSuccess(true);
                toast({ 
                    title: "Upload Successful ✅", 
                    description: "Your browser icon has been updated and saved.",
                });
                // Success feedback lasts for 5 seconds
                setTimeout(() => setUploadSuccess(false), 5000);
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            console.error("Favicon upload failed:", error);
            toast({ 
                title: "Upload Failed ❌", 
                description: error.message || "An unexpected error occurred during upload. Please check your connection.", 
                variant: "destructive" 
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 bg-secondary/20 rounded-2xl border border-dashed">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <Card className="border-border/50 rounded-2xl overflow-hidden">
            <CardHeader className="bg-secondary/10 border-b">
                <CardTitle className="text-xl flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Site Branding
                </CardTitle>
                <CardDescription>Configure global identity elements for FireLeagues.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                        <div className="space-y-2 shrink-0">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Current Favicon</Label>
                            <div className="relative w-24 h-24 bg-background rounded-2xl border-2 border-muted flex items-center justify-center overflow-hidden shadow-inner group">
                                {faviconUrl ? (
                                    <Image 
                                        src={faviconUrl} 
                                        alt="Current Favicon" 
                                        fill 
                                        className="object-contain p-3" 
                                        unoptimized
                                    />
                                ) : (
                                    <Globe className="h-8 w-8 text-muted-foreground/20" />
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Globe className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div>
                                <h4 className="font-bold text-base">Update Browser Icon</h4>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    This icon appears in browser tabs and bookmark bars. 
                                    Uploaded images are stored in the <code className="bg-muted px-1 rounded">fav-icon/</code> folder.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        ref={fileInputRef} 
                                        onChange={handleFileChange} 
                                    />
                                    <Button 
                                        onClick={() => fileInputRef.current?.click()} 
                                        disabled={isUploading}
                                        variant={uploadSuccess ? "outline" : "default"}
                                        className={cn(
                                            "rounded-xl h-11 px-6 font-bold shadow-lg transition-all",
                                            uploadSuccess ? "border-green-500 text-green-500 hover:bg-green-50" : "shadow-primary/20"
                                        )}
                                    >
                                        {isUploading ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : uploadSuccess ? (
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                        ) : (
                                            <Upload className="h-4 w-4 mr-2" />
                                        )}
                                        {isUploading ? 'Uploading...' : uploadSuccess ? 'Icon Saved!' : 'Upload New Icon'}
                                    </Button>
                                    
                                    {isUploading && (
                                        <span className="text-[10px] font-bold text-primary animate-pulse uppercase tracking-widest">
                                            Sending to bucket...
                                        </span>
                                    )}
                                </div>
                                
                                {uploadSuccess && (
                                    <p className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" />
                                        Database updated. Your new brand icon is now live.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <p className="text-[10px] font-medium text-primary/80 leading-relaxed italic">
                        * Note: If the icon doesn't update immediately, please clear your browser cache or refresh the page.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
